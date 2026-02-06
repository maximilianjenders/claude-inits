import { gh, git } from "../lib/exec.js";

const definition = {
  name: "gh_merge_pr",
  description: "Merge a pull request. Automatically removes any git worktree that has the PR branch checked out before merging.",
  inputSchema: {
    type: "object",
    properties: {
      cwd: {
        type: "string",
        description: "Working directory (defaults to MCP server cwd)",
      },
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
  const { cwd, pr, method, delete_branch, admin, subject, body } = args;

  const opts = cwd ? { cwd } : {};
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

  // If deleting branch, clean up any worktree first so gh can delete the local branch
  if (delete_branch !== false) {
    try {
      // Get the PR's head branch name
      const { stdout: prJson } = await gh(
        ["pr", "view", String(pr), "--json", "headRefName"],
        opts
      );
      const { headRefName } = JSON.parse(prJson);

      // Check if any worktree has this branch checked out
      const { stdout: worktreeList } = await git(
        ["worktree", "list", "--porcelain"],
        opts
      );

      // Parse porcelain output: blocks separated by blank lines
      // Each block has "worktree <path>", "HEAD <sha>", "branch refs/heads/<name>"
      let worktreePath = null;
      for (const block of worktreeList.split("\n\n")) {
        if (block.includes(`branch refs/heads/${headRefName}`)) {
          const match = block.match(/^worktree (.+)$/m);
          if (match) worktreePath = match[1];
        }
      }

      if (worktreePath) {
        try {
          await git(["worktree", "remove", worktreePath], opts);
        } catch {
          await git(["worktree", "remove", "--force", worktreePath], opts);
        }
      }
    } catch {
      // Best-effort — if worktree detection fails, proceed with merge anyway
    }
  }

  await gh(ghArgs, opts);

  // Get merge result info
  const { stdout } = await gh([
    "pr",
    "view",
    String(pr),
    "--json",
    "number,title,state,mergedAt,mergedBy,url",
  ], opts);

  const result = JSON.parse(stdout);

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export { definition, handler };
