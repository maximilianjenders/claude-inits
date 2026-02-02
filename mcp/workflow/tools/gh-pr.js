import { gh } from "../lib/exec.js";

const definition = {
  name: "gh_pr",
  description: "PR read operations: view single PR or list PRs with filters",
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
      pr: {
        type: "number",
        description: "PR number (for view action, omit to use current branch)",
      },
      head: {
        type: "string",
        description: "Filter by head branch (for list action)",
      },
      base: {
        type: "string",
        description: "Filter by base branch (for list action)",
      },
      state: {
        type: "string",
        enum: ["open", "closed", "merged", "all"],
        description: "Filter by state (for list action, default: open)",
      },
      author: {
        type: "string",
        description: "Filter by author (for list action)",
      },
      limit: {
        type: "number",
        description: "Maximum PRs to return (for list action, default: 30)",
      },
    },
    required: ["action"],
  },
};

async function viewPR(pr, opts = {}) {
  const ghArgs = [
    "pr",
    "view",
    "--json",
    "number,title,body,state,headRefName,baseRefName,url,milestone,labels,mergeable,reviewDecision,isDraft",
  ];

  if (pr) {
    ghArgs.splice(2, 0, String(pr));
  }

  const { stdout } = await gh(ghArgs, opts);
  return JSON.parse(stdout);
}

async function listPRs({ head, base, state, author, limit }, opts = {}) {
  const ghArgs = [
    "pr",
    "list",
    "--json",
    "number,title,state,headRefName,baseRefName,url,isDraft,author",
  ];

  if (state) {
    ghArgs.push("--state", state);
  }

  if (head) {
    ghArgs.push("--head", head);
  }

  if (base) {
    ghArgs.push("--base", base);
  }

  if (author) {
    ghArgs.push("--author", author);
  }

  if (limit) {
    ghArgs.push("--limit", String(limit));
  }

  const { stdout } = await gh(ghArgs, opts);
  return JSON.parse(stdout);
}

async function handler(args) {
  const { cwd, action, pr, head, base, state, author, limit } = args;
  const opts = cwd ? { cwd } : {};

  switch (action) {
    case "view":
      const prData = await viewPR(pr, opts);
      return {
        content: [{ type: "text", text: JSON.stringify(prData, null, 2) }],
      };

    case "list":
      const prs = await listPRs({ head, base, state, author, limit }, opts);
      return {
        content: [{ type: "text", text: JSON.stringify(prs, null, 2) }],
      };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export { definition, handler };
