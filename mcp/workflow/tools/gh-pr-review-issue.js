import { gh } from "../lib/exec.js";

const definition = {
  name: "gh_pr_review_issue",
  description: "Create a PR review issue with standard formatting",
  inputSchema: {
    type: "object",
    properties: {
      cwd: {
        type: "string",
        description: "Working directory (defaults to MCP server cwd)",
      },
      title: {
        type: "string",
        description: "Issue title (without [PR Review] prefix)",
      },
      milestone: {
        type: "string",
        description: "Milestone title",
      },
      pr_number: {
        type: "number",
        description: "PR number this review is for",
      },
      body: {
        type: "string",
        description: "Issue body (markdown)",
      },
    },
    required: ["title", "milestone", "pr_number", "body"],
  },
};

async function handler(args) {
  const { cwd, title, milestone, pr_number, body } = args;
  const opts = cwd ? { cwd } : {};

  // Build full body with source attribution
  const fullBody = `${body}

## Source

Found during PR #${pr_number} code review.`;

  // Create the issue
  const { stdout } = await gh([
    "issue", "create",
    "--title", `[PR Review] ${title}`,
    "--body", fullBody,
    "--label", "pr-review",
    "--milestone", milestone,
    "--json", "number,url"
  ], opts);

  const result = JSON.parse(stdout);

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export { definition, handler };
