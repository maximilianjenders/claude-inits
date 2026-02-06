import { git } from "../lib/exec.js";
import { resolve } from "path";

const definition = {
  name: "git_worktree_cleanup",
  description:
    "Remove a git worktree and optionally delete its branch. Handles ordering correctly (switches to main repo before removing) to avoid CWD-deleted-under-you errors.",
  inputSchema: {
    type: "object",
    properties: {
      cwd: {
        type: "string",
        description: "Working directory (defaults to MCP server cwd)",
      },
      worktree: {
        type: "string",
        description:
          "Worktree name (e.g., 'llm-improvements') — looked up under .worktrees/",
      },
      delete_branch: {
        type: "boolean",
        description:
          "Delete the associated branch after removing the worktree (default: false)",
      },
    },
    required: ["worktree"],
  },
};

async function handler(args) {
  const { worktree, delete_branch = false } = args;

  // Always resolve the main repo root from cwd or MCP server cwd.
  // If the caller is inside a worktree, git-common-dir gives us the main .git.
  const cwd = args.cwd || process.cwd();
  let repoRoot;
  try {
    const { stdout: commonDir } = await git("rev-parse --git-common-dir", {
      cwd,
    });
    // commonDir is either ".git" (already at root) or an absolute path like "/repo/.git"
    if (commonDir === ".git") {
      const { stdout } = await git("rev-parse --show-toplevel", { cwd });
      repoRoot = stdout;
    } else {
      // commonDir is e.g. /Users/max/Gits/food-butler/.git — parent is repo root
      repoRoot = resolve(commonDir, "..");
    }
  } catch (err) {
    throw new Error(`Could not determine repo root from ${cwd}: ${err.message}`);
  }

  const opts = { cwd: repoRoot };
  const worktreePath = resolve(repoRoot, ".worktrees", worktree);
  const actions = [];

  // Get the branch checked out in the worktree before removing it
  let worktreeBranch = null;
  try {
    const { stdout } = await git("branch --show-current", {
      cwd: worktreePath,
    });
    worktreeBranch = stdout;
  } catch (err) {
    // Worktree may already be gone or in detached HEAD
  }

  // Remove the worktree (from the main repo root — safe CWD)
  try {
    await git(["worktree", "remove", worktreePath], opts);
    actions.push(`Removed worktree at .worktrees/${worktree}`);
  } catch (err) {
    // Try force removal if regular fails (e.g., untracked files)
    try {
      await git(["worktree", "remove", "--force", worktreePath], opts);
      actions.push(`Force-removed worktree at .worktrees/${worktree}`);
    } catch (err2) {
      throw new Error(
        `Failed to remove worktree .worktrees/${worktree}: ${err2.message}`
      );
    }
  }

  // Delete the branch if requested
  if (delete_branch && worktreeBranch) {
    try {
      await git(["branch", "-d", worktreeBranch], opts);
      actions.push(`Deleted branch ${worktreeBranch}`);
    } catch (err) {
      // Branch may not be fully merged — report but don't fail
      actions.push(
        `Could not delete branch ${worktreeBranch} (not fully merged?): ${err.message}`
      );
    }
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          { repo_root: repoRoot, worktree, worktreeBranch, actions },
          null,
          2
        ),
      },
    ],
  };
}

export { definition, handler };
