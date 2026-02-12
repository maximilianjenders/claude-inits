import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Tool definitions (will be populated by tool modules)
const TOOLS = [];

// Tool handlers (will be populated by tool modules)
const toolHandlers = {};

// Helper to register tools
function registerTool(definition, handler) {
  TOOLS.push(definition);
  toolHandlers[definition.name] = handler;
}

// Create and configure the MCP server
const server = new Server(
  {
    name: "workflow-mcp-server",
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

// Load tools dynamically
async function loadTools() {
  const toolModules = [
    "./tools/project-files.js",
    "./tools/git-state.js",
    "./tools/git-diff.js",
    "./tools/gh-milestone.js",
    "./tools/gh-milestone-issues.js",
    "./tools/gh-bulk-issues.js",
    "./tools/gh-update-issue.js",
    "./tools/gh-update-pr.js",
    "./tools/gh-issue.js",
    "./tools/gh-pr-review-issue.js",
    "./tools/gh-create-pr.js",
    "./tools/gh-merge-pr.js",
    "./tools/gh-pr.js",
    "./tools/git-worktree-cleanup.js",
  ];

  for (const modulePath of toolModules) {
    const module = await import(modulePath);
    registerTool(module.definition, module.handler);
  }
}

// Start the server
async function main() {
  // Resolve and cache the main repo root while process.cwd() is still valid.
  // This survives worktree deletion — gh/git calls fall back to repo root.
  const { initSafeCwd } = await import("./lib/exec.js");
  await initSafeCwd();

  await loadTools();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Workflow MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { registerTool, server };
