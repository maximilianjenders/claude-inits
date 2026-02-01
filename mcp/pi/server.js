import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";

// Configuration
const PI_HOST = "max@pi.local";
const VALID_APPS = ["food-butler", "spendee"];
const VALID_ENVS = ["prod", "staging", "dev"];

// App-specific configurations
// To add a new app: add entry here with containerPrefix and seedCommand
const APP_CONFIG = {
  "food-butler": {
    containerPrefix: "butler",
    seedCommand: "python -m app.scripts.seed_e2e_fixtures",
  },
  spendee: {
    containerPrefix: "spendee",
    seedCommand: "python -m app.scripts.seed_e2e_fixtures",
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
  return path;
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
      `rm -rf /data/${args.app}/dev/* && docker restart ${containerPrefix}-dev`
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
  getContainerPrefix,
  getSeedCommand,
  executeSSH,
  formatResult,
  server,
};
