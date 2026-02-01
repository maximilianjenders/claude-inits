import { git, gh } from "../lib/exec.js";

const definition = {
  name: "git_state",
  description: "Get current git state including branch, worktree status, and associated PR",
  inputSchema: {
    type: "object",
    properties: {
      branch_pattern: {
        type: "string",
        description: "Pattern to match existing branches (optional)",
      },
    },
    required: [],
  },
};

async function handler(args) {
  const result = {
    branch: null,
    is_worktree: false,
    worktree_path: null,
    pr: null,
    worktrees: [],
    matching_branches: [],
  };

  // Get current branch
  try {
    const { stdout } = await git("branch --show-current");
    result.branch = stdout;
  } catch (err) {
    // Detached HEAD or other issue
    result.branch = null;
  }

  // Check if in a worktree
  try {
    const { stdout } = await git("rev-parse --git-common-dir");
    const commonDir = stdout;
    const { stdout: gitDir } = await git("rev-parse --git-dir");
    result.is_worktree = commonDir !== gitDir && commonDir !== ".git";
    if (result.is_worktree) {
      const { stdout: toplevel } = await git("rev-parse --show-toplevel");
      result.worktree_path = toplevel;
    }
  } catch (err) {
    // Not in a git repo
  }

  // List worktrees
  try {
    const { stdout } = await git("worktree list --porcelain");
    const worktrees = [];
    const lines = stdout.split("\n");
    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        const path = line.replace("worktree ", "");
        // Extract just the directory name for non-main worktrees
        if (path.includes(".worktrees/")) {
          worktrees.push(path.split(".worktrees/")[1]);
        }
      }
    }
    result.worktrees = worktrees;
  } catch (err) {
    // No worktrees
  }

  // Get PR for current branch
  if (result.branch) {
    try {
      const { stdout } = await gh([
        "pr", "list",
        "--head", result.branch,
        "--json", "number,url",
        "--jq", ".[0]"
      ]);
      if (stdout) {
        const pr = JSON.parse(stdout);
        result.pr = { number: pr.number, url: pr.url };
      }
    } catch (err) {
      // No PR for this branch
    }
  }

  // Find matching branches if pattern provided
  if (args.branch_pattern) {
    try {
      const { stdout } = await git(["branch", "-a", "--list", `*${args.branch_pattern}*`]);
      result.matching_branches = stdout
        .split("\n")
        .map((b) => b.trim().replace(/^\* /, ""))
        .filter((b) => b);
    } catch (err) {
      // No matching branches
    }
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export { definition, handler };
