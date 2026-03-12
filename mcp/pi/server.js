import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";

// Configuration
// Use Tailscale MagicDNS name for remote access (pi.local only works on LAN)
const PI_HOST = "max@pi";
const VALID_APPS = ["food-butler", "spendee"];
const VALID_ENVS = ["prod", "staging", "dev"];

// Allowed commands for docker exec/run (read-only operations)
// NOTE: "env" intentionally excluded — it dumps all container env vars including secrets
const ALLOWED_COMMANDS = ["cat", "ls", "head", "tail", "find", "grep", "ps", "stat"];

// Blocked path patterns for pi_read_file (sensitive files)
const BLOCKED_PATH_PATTERNS = [
  /\.env($|\.)/,   // .env, .env.local, .env.production, etc.
  /\/\.ssh\//,     // SSH keys and config
  /\/etc\/shadow$/, // Password hashes
  /\/etc\/passwd$/, // User accounts
];

// App-specific configurations
// To add a new app: add entry here with containerPrefix and seedCommand
const APP_CONFIG = {
  "food-butler": {
    containerPrefix: "butler",
    seedCommand: "python -m app.scripts.seed_e2e_fixtures",
    dbPath: "/app/data/food_butler.db",
  },
  spendee: {
    containerPrefix: "spendee",
    seedCommand: "python -m spendee_visualiser.scripts.seed_e2e_fixtures",
    dbPath: "/app/data/spendee.db",
  },
  // Example for future apps:
  // "new-app": {
  //   containerPrefix: "newapp",
  //   seedCommand: "python -m app.scripts.seed_fixtures",
  // },
};

// Input sanitization - reject shell metacharacters
const DANGEROUS_CHARS = /[;|&$`()><]/;

function sanitizeInput(input) {
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }
  if (DANGEROUS_CHARS.test(input)) {
    throw new Error(
      `Input contains dangerous characters: ${input.match(DANGEROUS_CHARS)[0]}`
    );
  }
  return input;
}

function validateApp(app) {
  sanitizeInput(app);
  if (!VALID_APPS.includes(app)) {
    throw new Error(`Invalid app: ${app}. Must be one of: ${VALID_APPS.join(", ")}`);
  }
  return app;
}

function validateEnv(env) {
  sanitizeInput(env);
  if (!VALID_ENVS.includes(env)) {
    throw new Error(`Invalid env: ${env}. Must be one of: ${VALID_ENVS.join(", ")}`);
  }
  return env;
}

function validatePath(path) {
  sanitizeInput(path);
  if (!path.startsWith("/")) {
    throw new Error(`Path must be absolute: ${path}`);
  }
  for (const pattern of BLOCKED_PATH_PATTERNS) {
    if (pattern.test(path)) {
      throw new Error(`Blocked: path matches sensitive pattern: ${path}`);
    }
  }
  return path;
}

function validateCommand(command) {
  sanitizeInput(command);
  if (!ALLOWED_COMMANDS.includes(command)) {
    throw new Error(`Command not allowed: ${command}. Must be one of: ${ALLOWED_COMMANDS.join(", ")}`);
  }
  return command;
}

// Allowed first keywords for SQL queries
const ALLOWED_QUERY_STARTS = ["SELECT", "PRAGMA", "EXPLAIN", "WITH"];

// Blocked SQL keywords (write/admin operations)
const BLOCKED_QUERY_KEYWORDS = [
  "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE",
  "REPLACE", "ATTACH", "DETACH", "VACUUM", "REINDEX", "BEGIN", "SAVEPOINT",
];

function validateQuery(query) {
  if (typeof query !== "string") {
    throw new Error("Query must be a string");
  }
  query = query.trim();
  if (!query) {
    throw new Error("Query must not be empty");
  }
  // Block dot-commands (.shell, .read, etc.)
  if (query.startsWith(".")) {
    throw new Error("Dot-commands are not allowed (e.g. .shell, .read)");
  }
  // Block double quotes and backslashes (shell injection prevention)
  if (/["\\]/.test(query)) {
    throw new Error("Query must not contain double quotes or backslashes (use single quotes for strings)");
  }
  // Strip comments for keyword checking (naive regex, not a parser)
  const stripped = query
    .replace(/--[^\n]*/g, "")        // line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .trim();
  const upper = stripped.toUpperCase();
  // Block write/admin keywords anywhere (check before first-keyword check
  // so that e.g. INSERT gets a "blocked" error, not "must start with")
  for (const keyword of BLOCKED_QUERY_KEYWORDS) {
    if (new RegExp(`\\b${keyword}\\b`).test(upper)) {
      throw new Error(`Blocked keyword: ${keyword}. Only read-only queries are allowed.`);
    }
  }
  // Check first keyword
  const firstWord = upper.split(/\s+/)[0];
  if (!ALLOWED_QUERY_STARTS.includes(firstWord)) {
    throw new Error(`Query must start with one of: ${ALLOWED_QUERY_STARTS.join(", ")}`);
  }
  return query;
}

function applyPagination(query, limit, offset) {
  const hasLimit = /\bLIMIT\b/i.test(query);
  if (!hasLimit) {
    query += ` LIMIT ${limit}`;
    if (offset > 0) {
      query += ` OFFSET ${offset}`;
    }
  }
  return query;
}

// DB path mapping (uses APP_CONFIG)
function getDbPath(app) {
  return APP_CONFIG[app]?.dbPath;
}

// Container name mapping (uses APP_CONFIG)
function getContainerPrefix(app) {
  return APP_CONFIG[app]?.containerPrefix || app;
}

// Seed command mapping (uses APP_CONFIG)
function getSeedCommand(app) {
  return APP_CONFIG[app]?.seedCommand;
}

// SSH execution helper
function executeSSH(command) {
  return new Promise((resolve) => {
    const ssh = spawn("ssh", [PI_HOST, command]);

    let stdout = "";
    let stderr = "";

    ssh.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ssh.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ssh.on("close", (exitCode) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
      });
    });

    ssh.on("error", (err) => {
      resolve({
        stdout: "",
        stderr: err.message,
        exitCode: 1,
      });
    });
  });
}

// Format SSH result for MCP response
function formatResult(result) {
  const parts = [];
  if (result.stdout) {
    parts.push(result.stdout);
  }
  if (result.stderr) {
    parts.push(`[stderr] ${result.stderr}`);
  }
  parts.push(`[exit code: ${result.exitCode}]`);
  return parts.join("\n");
}

// Tool definitions
const TOOLS = [
  {
    name: "pi_docker_ps",
    description: "List running Docker containers on the Pi",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "pi_docker_logs",
    description: "Get logs from a Docker container on the Pi",
    inputSchema: {
      type: "object",
      properties: {
        container: {
          type: "string",
          description: "Container name",
        },
        lines: {
          type: "number",
          description: "Number of lines to show (default: 100)",
        },
      },
      required: ["container"],
    },
  },
  {
    name: "pi_docker_restart",
    description: "Restart a Docker container on the Pi",
    inputSchema: {
      type: "object",
      properties: {
        container: {
          type: "string",
          description: "Container name",
        },
      },
      required: ["container"],
    },
  },
  {
    name: "pi_docker_stop",
    description: "Stop a Docker container on the Pi",
    inputSchema: {
      type: "object",
      properties: {
        container: {
          type: "string",
          description: "Container name",
        },
      },
      required: ["container"],
    },
  },
  {
    name: "pi_deploy",
    description: "Deploy an application to the Pi",
    inputSchema: {
      type: "object",
      properties: {
        app: {
          type: "string",
          description: "Application name (food-butler or spendee)",
        },
        env: {
          type: "string",
          description: "Environment (prod, staging, or dev)",
        },
        branch: {
          type: "string",
          description: "Git branch (required for staging/dev, ignored for prod)",
        },
      },
      required: ["app", "env"],
    },
  },
  {
    name: "pi_read_file",
    description: "Read a file from the Pi",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the file",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "pi_git_pull",
    description: "Pull latest changes to pi-setup repo on the Pi",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "pi_reset_dev",
    description: "Reset dev environment for an app (wipes data and restarts container)",
    inputSchema: {
      type: "object",
      properties: {
        app: {
          type: "string",
          description: "Application name (food-butler or spendee)",
        },
      },
      required: ["app"],
    },
  },
  {
    name: "pi_copy_prod_to_staging",
    description: "Copy production database to staging for an app",
    inputSchema: {
      type: "object",
      properties: {
        app: {
          type: "string",
          description: "Application name (food-butler or spendee)",
        },
      },
      required: ["app"],
    },
  },
  {
    name: "pi_seed_dev",
    description: "Seed E2E fixtures in dev environment for an app",
    inputSchema: {
      type: "object",
      properties: {
        app: {
          type: "string",
          description: "Application name (food-butler or spendee)",
        },
      },
      required: ["app"],
    },
  },
  {
    name: "pi_docker_inspect",
    description: "Get metadata about a container or image (creation time, config, etc.). Format parameter is required; Env-accessing formats are blocked.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "Container name or image reference",
        },
        format: {
          type: "string",
          description: "Go template format string (e.g., '{{.Config.Image}}', '{{.Created}}'). Env access is blocked.",
        },
      },
      required: ["target", "format"],
    },
  },
  {
    name: "pi_docker_exec",
    description: `Run a read-only command inside a running container. Allowed commands: ${ALLOWED_COMMANDS.join(", ")}`,
    inputSchema: {
      type: "object",
      properties: {
        container: {
          type: "string",
          description: "Container name",
        },
        command: {
          type: "string",
          description: `Command to run (must be one of: ${ALLOWED_COMMANDS.join(", ")})`,
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Arguments to pass to the command",
        },
      },
      required: ["container", "command"],
    },
  },
  {
    name: "pi_docker_run",
    description: `Run a read-only command in a temporary container from an image. Allowed commands: ${ALLOWED_COMMANDS.join(", ")}`,
    inputSchema: {
      type: "object",
      properties: {
        image: {
          type: "string",
          description: "Image reference (e.g., ghcr.io/user/repo:tag)",
        },
        command: {
          type: "string",
          description: `Command to run (must be one of: ${ALLOWED_COMMANDS.join(", ")})`,
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Arguments to pass to the command",
        },
      },
      required: ["image", "command"],
    },
  },
  {
    name: "pi_db_query",
    description:
      "Run a read-only SQL query against an app's SQLite database. " +
      "Available databases: food-butler (/app/data/food_butler.db), spendee (/app/data/spendee.db). " +
      "Environments: prod (live data), staging (prod copy for testing), dev (seeded test fixtures). " +
      "Supports SELECT, PRAGMA, EXPLAIN, WITH. Results are pipe-delimited with headers. " +
      "Default limit: 500 rows. Use limit/offset for pagination.",
    inputSchema: {
      type: "object",
      properties: {
        app: {
          type: "string",
          description: "Application name (food-butler or spendee)",
        },
        env: {
          type: "string",
          description: "Environment (prod, staging, or dev)",
        },
        query: {
          type: "string",
          description: "SQL query (SELECT, PRAGMA, EXPLAIN, or WITH only)",
        },
        limit: {
          type: "number",
          description: "Max rows to return (default: 500). Appended as LIMIT if query has none.",
        },
        offset: {
          type: "number",
          description: "Row offset for pagination (default: 0)",
        },
      },
      required: ["app", "env", "query"],
    },
  },
];

// Tool handlers (stubs - to be implemented in later issues)
const toolHandlers = {
  pi_docker_ps: async () => {
    const result = await executeSSH("docker ps");
    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_docker_logs: async (args) => {
    sanitizeInput(args.container);
    const lines = args.lines || 100;
    const result = await executeSSH(`docker logs ${args.container} --tail ${lines}`);
    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_docker_restart: async (args) => {
    sanitizeInput(args.container);
    const result = await executeSSH(`docker restart ${args.container}`);
    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_docker_stop: async (args) => {
    sanitizeInput(args.container);
    const result = await executeSSH(`docker stop ${args.container}`);
    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_deploy: async (args) => {
    validateApp(args.app);
    validateEnv(args.env);

    let command = `cd ~/pi-setup && ./build.sh ${args.app} ${args.env}`;

    // Branch required for non-prod, ignored for prod
    if (args.env !== "prod") {
      if (!args.branch) {
        return {
          content: [
            {
              type: "text",
              text: "Error: branch is required for staging/dev deployments",
            },
          ],
          isError: true,
        };
      }
      sanitizeInput(args.branch);
      command += ` ${args.branch}`;
    }

    const result = await executeSSH(command);

    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_read_file: async (args) => {
    validatePath(args.path);
    const result = await executeSSH(`cat ${args.path}`);
    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_git_pull: async () => {
    const result = await executeSSH("cd ~/pi-setup && git pull");
    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_reset_dev: async (args) => {
    validateApp(args.app);
    const containerPrefix = getContainerPrefix(args.app);
    const result = await executeSSH(
      `rm -rf /data/${containerPrefix}/dev/* && docker restart ${containerPrefix}-dev`
    );
    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_copy_prod_to_staging: async (args) => {
    validateApp(args.app);
    const result = await executeSSH(
      `~/pi-setup/scripts/copy-prod-to-staging.sh ${args.app}`
    );
    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_seed_dev: async (args) => {
    validateApp(args.app);
    const containerPrefix = getContainerPrefix(args.app);
    const seedCommand = getSeedCommand(args.app);
    if (!seedCommand) {
      return {
        content: [
          {
            type: "text",
            text: `Error: No seed command configured for ${args.app}`,
          },
        ],
        isError: true,
      };
    }
    const result = await executeSSH(
      `docker exec ${containerPrefix}-dev ${seedCommand}`
    );
    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_docker_inspect: async (args) => {
    sanitizeInput(args.target);
    let command = `docker inspect ${args.target}`;
    if (args.format) {
      sanitizeInput(args.format);
      // Block format strings that access environment variables (contains secrets)
      if (/Env/i.test(args.format)) {
        return {
          content: [{ type: "text", text: "Error: format accessing Env is blocked (contains secrets)" }],
          isError: true,
        };
      }
      command += ` --format "${args.format}"`;
    } else {
      // Without --format, full JSON output includes .Config.Env with secrets.
      // Require a format parameter to force callers to request specific fields.
      return {
        content: [{ type: "text", text: "Error: --format parameter is required (unformatted output contains secrets)" }],
        isError: true,
      };
    }
    const result = await executeSSH(command);
    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_docker_exec: async (args) => {
    sanitizeInput(args.container);
    validateCommand(args.command);

    // Build command with args (no shell expansion)
    const cmdParts = [`docker exec ${args.container} ${args.command}`];
    if (args.args && args.args.length > 0) {
      for (const arg of args.args) {
        sanitizeInput(arg);
        cmdParts.push(`"${arg}"`);
      }
    }

    const result = await executeSSH(cmdParts.join(" "));
    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_docker_run: async (args) => {
    sanitizeInput(args.image);
    validateCommand(args.command);

    // Build command with args (no shell expansion)
    const cmdParts = [`docker run --rm ${args.image} ${args.command}`];
    if (args.args && args.args.length > 0) {
      for (const arg of args.args) {
        sanitizeInput(arg);
        cmdParts.push(`"${arg}"`);
      }
    }

    const result = await executeSSH(cmdParts.join(" "));
    return { content: [{ type: "text", text: formatResult(result) }] };
  },

  pi_db_query: async (args) => {
    validateApp(args.app);
    validateEnv(args.env);
    validateQuery(args.query);

    const containerPrefix = getContainerPrefix(args.app);
    const container = `${containerPrefix}-${args.env}`;
    const dbPath = getDbPath(args.app);
    if (!dbPath) {
      return {
        content: [{ type: "text", text: `Error: No database path configured for ${args.app}` }],
        isError: true,
      };
    }

    const limit = args.limit || 500;
    const offset = args.offset || 0;
    const query = applyPagination(args.query.trim(), limit, offset);
    // Escape single quotes for shell: replace ' with '\''
    const escapedQuery = query.replace(/'/g, "'\\''");

    const command = `timeout 30 docker exec ${container} sqlite3 -readonly -header -separator '|' ${dbPath} '${escapedQuery}'`;
    const result = await executeSSH(command);
    return { content: [{ type: "text", text: formatResult(result) }] };
  },
};

// Create and configure the MCP server
const server = new Server(
  {
    name: "pi-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const handler = toolHandlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    return await handler(args || {});
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pi MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

// Export for testing
export {
  sanitizeInput,
  validateApp,
  validateEnv,
  validatePath,
  validateCommand,
  validateQuery,
  applyPagination,
  getContainerPrefix,
  getSeedCommand,
  getDbPath,
  executeSSH,
  formatResult,
  server,
  ALLOWED_COMMANDS,
  BLOCKED_PATH_PATTERNS,
};
