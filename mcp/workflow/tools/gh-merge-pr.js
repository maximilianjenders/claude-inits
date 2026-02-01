import { gh } from "../lib/exec.js";

const definition = {
  name: "gh_merge_pr",
  description: "Merge a pull request",
  inputSchema: {
    type: "object",
    properties: {
      pr: {
        type: "number",
        description: "PR number to merge",
      },
      method: {
        type: "string",
        enum: ["merge", "squash", "rebase"],
        description: "Merge method (default: merge)",
      },
      delete_branch: {
        type: "boolean",
        description: "Delete head branch after merge (default: true)",
      },
      admin: {
        type: "boolean",
        description: "Merge even if requirements not met (admin override)",
      },
      subject: {
        type: "string",
        description: "Custom commit subject (for squash/merge)",
      },
      body: {
        type: "string",
        description: "Custom commit body (for squash/merge)",
      },
    },
    required: ["pr"],
  },
};

async function handler(args) {
  const { pr, method, delete_branch, admin, subject, body } = args;

  const ghArgs = ["pr", "merge", String(pr)];

  // Merge method
  if (method === "squash") {
    ghArgs.push("--squash");
  } else if (method === "rebase") {
    ghArgs.push("--rebase");
  } else {
    ghArgs.push("--merge");
  }

  // Branch deletion (default true)
  if (delete_branch === false) {
    ghArgs.push("--delete-branch=false");
  } else {
    ghArgs.push("--delete-branch");
  }

  if (admin) {
    ghArgs.push("--admin");
  }

  if (subject) {
    ghArgs.push("--subject", subject);
  }

  if (body) {
    ghArgs.push("--body", body);
  }

  await gh(ghArgs);

  // Get merge result info
  const { stdout } = await gh([
    "pr",
    "view",
    String(pr),
    "--json",
    "number,title,state,mergedAt,mergedBy,url",
  ]);

  const result = JSON.parse(stdout);

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export { definition, handler };
