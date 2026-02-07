import { spawn } from "child_process";

/**
 * Execute a command and return stdout/stderr
 */
function exec(command, args = [], options = {}) {
  const { timeout = 30000, cwd } = options;

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      timeout,
      cwd,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
      } else {
        const error = new Error(stderr.trim() || `Command failed with exit code ${code}`);
        error.code = code;
        error.stdout = stdout.trim();
        error.stderr = stderr.trim();
        reject(error);
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Execute gh CLI command
 */
async function gh(args, options = {}) {
  const argArray = typeof args === "string" ? args.split(/\s+/) : args;
  return exec("gh", argArray, options);
}

/**
 * Execute git command
 */
async function git(args, options = {}) {
  const argArray = typeof args === "string" ? args.split(/\s+/) : args;
  return exec("git", argArray, options);
}

/**
 * Resolve a CWD to the main repo root (handles worktrees).
 * If cwd is inside a worktree, returns the main repo root.
 * If cwd is already the main repo, returns the repo root.
 */
async function resolveRepoRoot(cwd) {
  const { resolve } = await import("path");
  const effectiveCwd = cwd || process.cwd();
  const { stdout: commonDir } = await git("rev-parse --git-common-dir", {
    cwd: effectiveCwd,
  });
  if (commonDir === ".git") {
    const { stdout } = await git("rev-parse --show-toplevel", {
      cwd: effectiveCwd,
    });
    return stdout;
  }
  // commonDir is e.g. /Users/max/Gits/food-butler/.git — parent is repo root
  return resolve(commonDir, "..");
}

export { exec, gh, git, resolveRepoRoot };
