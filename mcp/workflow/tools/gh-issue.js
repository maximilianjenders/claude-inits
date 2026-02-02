import { gh } from "../lib/exec.js";

const definition = {
  name: "gh_issue",
  description: "Issue read operations: view single issue or list issues with filters",
  inputSchema: {
    type: "object",
    properties: {
      cwd: {
        type: "string",
        description: "Working directory (defaults to MCP server cwd)",
      },
      action: {
        type: "string",
        enum: ["view", "list"],
        description: "Action to perform",
      },
      issue: {
        type: "number",
        description: "Issue number (required for view action)",
      },
      labels: {
        type: "array",
        items: { type: "string" },
        description: "Filter by labels (for list action)",
      },
      state: {
        type: "string",
        enum: ["open", "closed", "all"],
        description: "Filter by state (for list action, default: open)",
      },
      assignee: {
        type: "string",
        description: "Filter by assignee (for list action)",
      },
      limit: {
        type: "number",
        description: "Maximum issues to return (for list action, default: 30)",
      },
    },
    required: ["action"],
  },
};

async function viewIssue(issue, opts = {}) {
  const { stdout } = await gh([
    "issue",
    "view",
    String(issue),
    "--json",
    "number,title,body,state,labels,milestone,assignees,url,createdAt,closedAt",
  ], opts);
  return JSON.parse(stdout);
}

async function listIssues({ labels, state, assignee, limit }, opts = {}) {
  const ghArgs = [
    "issue",
    "list",
    "--json",
    "number,title,state,labels,milestone,assignees,url",
  ];

  if (state) {
    ghArgs.push("--state", state);
  }

  if (labels && labels.length > 0) {
    ghArgs.push("--label", labels.join(","));
  }

  if (assignee) {
    ghArgs.push("--assignee", assignee);
  }

  if (limit) {
    ghArgs.push("--limit", String(limit));
  }

  const { stdout } = await gh(ghArgs, opts);
  return JSON.parse(stdout);
}

async function handler(args) {
  const { cwd, action, issue, labels, state, assignee, limit } = args;
  const opts = cwd ? { cwd } : {};

  switch (action) {
    case "view":
      if (!issue) {
        throw new Error("issue number is required for view action");
      }
      const issueData = await viewIssue(issue, opts);
      return {
        content: [{ type: "text", text: JSON.stringify(issueData, null, 2) }],
      };

    case "list":
      const issues = await listIssues({ labels, state, assignee, limit }, opts);
      return {
        content: [{ type: "text", text: JSON.stringify(issues, null, 2) }],
      };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export { definition, handler };
