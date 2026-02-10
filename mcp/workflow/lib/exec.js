import { spawn } from "child_process";
import { existsSync } from "fs";

// Cached repo root resolved eagerly at startup via initSafeCwd().
// Survives worktree deletion because it points to the main repo root.
let _cachedRepoRoot = null;

/**
 * Eagerly resolve the main repo root while process.cwd() is still valid.
 * Call this once at server startup, before any worktree might be deleted.
 */
async function initSafeCwd() {
  try {
    _cachedRepoRoot = await resolveRepoRoot();
  } catch {
    // Not in a git repo — fall back to process.cwd() at startup
    _cachedRepoRoot = process.cwd();
  }
}

/**
 * Get a CWD that survives worktree deletion.
 * Returns the cached repo root from initSafeCwd(), or falls back safely.
 */
async function getSafeCwd() {
  if (_cachedRepoRoot && existsSync(_cachedRepoRoot)) {
    return _cachedRepoRoot;
  }
  // Cache miss or directory deleted — try to resolve (may fail if CWD gone)
  try {
    _cachedRepoRoot = await resolveRepoRoot();
    return _cachedRepoRoot;
  } catch {
    const { homedir } = await import("os");
    return homedir();
  }
}

/**
 * Execute a command and return stdout/stderr
 */
function exec(command, args = [], options = {}) {
  const { timeout = 30000, cwd, input } = options;

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      timeout,
      cwd,
      shell: false,
    });

    if (input !== undefined) {
      proc.stdin.write(input);
      proc.stdin.end();
    }

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
 * Execute gh CLI command.
 * If no cwd is provided, uses a safe fallback that survives worktree deletion.
 */
async function gh(args, options = {}) {
  const argArray = typeof args === "string" ? args.split(/\s+/) : args;
  if (!options.cwd) {
    options = { ...options, cwd: await getSafeCwd() };
  }
  return exec("gh", argArray, options);
}

/**
 * Execute git command.
 * If no cwd is provided, uses a safe fallback that survives worktree deletion.
 */
async function git(args, options = {}) {
  const argArray = typeof args === "string" ? args.split(/\s+/) : args;
  if (!options.cwd) {
    options = { ...options, cwd: await getSafeCwd() };
  }
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
  const { stdout: commonDir } = await exec("git", ["rev-parse", "--git-common-dir"], {
    cwd: effectiveCwd,
  });
  if (commonDir === ".git") {
    const { stdout } = await exec("git", ["rev-parse", "--show-toplevel"], {
      cwd: effectiveCwd,
    });
    return stdout;
  }
  // commonDir is e.g. /Users/max/Gits/food-butler/.git — parent is repo root
  return resolve(commonDir, "..");
}

export { exec, gh, git, resolveRepoRoot, initSafeCwd };
