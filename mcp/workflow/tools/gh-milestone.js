import { gh } from "../lib/exec.js";

const definition = {
  name: "gh_milestone",
  description: "Milestone operations: list, find, close, open, rename",
  inputSchema: {
    type: "object",
    properties: {
      cwd: {
        type: "string",
        description: "Working directory (defaults to MCP server cwd)",
      },
      action: {
        type: "string",
        enum: ["list", "find", "close", "open", "rename"],
        description: "Action to perform",
      },
      identifier: {
        type: "string",
        description: "Milestone number or title pattern (required for find/close/open/rename, ignored for list)",
      },
      state: {
        type: "string",
        enum: ["open", "closed", "all"],
        description: "Filter by state (for list action, default: open)",
      },
      new_title: {
        type: "string",
        description: "New title (required for rename action)",
      },
    },
    required: ["action"],
  },
};

async function findMilestone(identifier, opts = {}) {
  // If it's a number, fetch directly
  if (/^\d+$/.test(identifier)) {
    const { stdout } = await gh([
      "api",
      `repos/{owner}/{repo}/milestones/${identifier}`,
      "--jq", '{ number, title, state, open_issues, closed_issues }'
    ], opts);
    return JSON.parse(stdout);
  }

  // Otherwise search by title
  const { stdout } = await gh([
    "api", "repos/{owner}/{repo}/milestones",
    "--jq", `.[] | select(.title | contains("${identifier}")) | { number, title, state, open_issues, closed_issues }`
  ], opts);

  if (!stdout) {
    throw new Error(`No milestone found matching: ${identifier}`);
  }

  // Take first match
  const lines = stdout.trim().split("\n");
  return JSON.parse(lines[0]);
}

async function listMilestones(state = "open", opts = {}) {
  const stateParam = state === "all" ? "all" : state;
  const { stdout } = await gh([
    "api",
    `repos/{owner}/{repo}/milestones?state=${stateParam}`,
    "--jq",
    ".[] | { number, title, state, open_issues, closed_issues, description }",
  ], opts);

  if (!stdout.trim()) {
    return [];
  }

  // Parse NDJSON (one object per line)
  return stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

async function handler(args) {
  const { cwd, action, identifier, new_title, state } = args;
  const opts = cwd ? { cwd } : {};

  // Handle list action separately (no identifier needed)
  if (action === "list") {
    const milestones = await listMilestones(state, opts);
    return {
      content: [{ type: "text", text: JSON.stringify(milestones, null, 2) }],
    };
  }

  // All other actions require identifier
  if (!identifier) {
    throw new Error(`identifier is required for ${action} action`);
  }

  // Find the milestone first
  const milestone = await findMilestone(identifier, opts);

  switch (action) {
    case "find":
      return {
        content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }],
      };

    case "close":
      await gh([
        "api", "-X", "PATCH",
        `repos/{owner}/{repo}/milestones/${milestone.number}`,
        "-f", "state=closed"
      ], opts);
      milestone.state = "closed";
      return {
        content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }],
      };

    case "open":
      await gh([
        "api", "-X", "PATCH",
        `repos/{owner}/{repo}/milestones/${milestone.number}`,
        "-f", "state=open"
      ], opts);
      milestone.state = "open";
      return {
        content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }],
      };

    case "rename":
      if (!new_title) {
        throw new Error("new_title is required for rename action");
      }
      await gh([
        "api", "-X", "PATCH",
        `repos/{owner}/{repo}/milestones/${milestone.number}`,
        "-f", `title=${new_title}`
      ], opts);
      milestone.title = new_title;
      return {
        content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }],
      };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export { definition, handler };
