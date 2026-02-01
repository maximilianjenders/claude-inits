# MCP Server Consolidation Design

**Date:** 2026-02-01
**Status:** Draft

## Goal

Consolidate Claude tooling into two MCP servers, replacing shell scripts with auto-discovered tools. Eliminates per-project documentation duplication.

## Current State

- **Pi MCP server** (`pi-setup/mcp/`): 10 tools for Pi/Docker operations via SSH
- **Shell scripts** (`claude-inits/scripts/`): 7 bash scripts for GitHub/git workflow, documented in every project's CLAUDE.md

**Problems:**
- Scripts require Helper Scripts tables in every CLAUDE.md (3+ files to update)
- Scripts need permission whitelist entries
- Claude must know exact invocation syntax

## Design

### Repository Structure

```
claude-inits/
├── mcp/
│   ├── workflow/              # GitHub/git workflow tools (NEW)
│   │   ├── server.js
│   │   ├── package.json
│   │   ├── lib/
│   │   │   ├── github-api.js  # Retry logic, batch execution
│   │   │   └── exec.js        # Command execution helpers
│   │   └── tools/
│   │       ├── git-state.js
│   │       ├── gh-milestone.js
│   │       ├── gh-milestone-issues.js
│   │       ├── gh-bulk-issues.js
│   │       └── gh-pr-review-issue.js
│   │
│   └── pi/                    # Pi SSH tools (MOVED from pi-setup)
│       ├── server.js
│       ├── package.json
│       └── (existing code, unchanged)
│
└── skills/
```

### Workflow Server Tools (5 tools)

#### `git_state`
Get current git state including branch, worktree status, and associated PR.

**Parameters:**
- `branch_pattern` (optional): Pattern to match existing branches

**Returns:**
```json
{
  "branch": "phase5-variety-tracking",
  "is_worktree": true,
  "worktree_path": "/Users/max/Gits/food-butler/.worktrees/phase5-variety-tracking",
  "pr": {
    "number": 99,
    "url": "https://github.com/owner/repo/pull/99"
  },
  "worktrees": ["phase1-recipe-management", "phase5-variety-tracking"],
  "matching_branches": []
}
```

#### `gh_milestone`
Milestone operations: find, close, open, rename.

**Parameters:**
- `action` (required): "find", "close", "open", or "rename"
- `identifier` (required): Milestone number or title pattern
- `new_title` (optional): New title for rename action

**Returns:**
```json
{
  "number": 14,
  "title": "[ACTIVE] Phase 5: Variety Tracking",
  "state": "open",
  "open_issues": 4,
  "closed_issues": 12
}
```

#### `gh_milestone_issues`
List issues in a milestone with full metadata.

**Parameters:**
- `milestone` (required): Milestone title
- `state` (optional): "open", "closed", or "all" (default: "all")
- `label` (optional): Filter by label

**Returns:**
```json
[
  {
    "number": 103,
    "title": "[PR Review] Refresh variety widgets after logging exposure",
    "state": "open",
    "labels": ["pr-review"]
  }
]
```

#### `gh_bulk_issues`
Bulk operations on multiple issues with retry logic.

**Parameters:**
- `action` (required): "label", "unlabel", "close", or "reopen"
- `issues` (required): Array of issue numbers
- `label` (optional): Label to add/remove (required for label/unlabel actions)
- `comment` (optional): Comment to add when closing

**Returns:**
```json
{
  "succeeded": [100, 101, 103],
  "failed": [
    {"issue": 102, "error": "API timeout after 3 retries"}
  ],
  "summary": "3/4 issues processed successfully"
}
```

**Reliability features:**
- 150ms delay between API calls
- Up to 3 retries with exponential backoff (1s, 2s, 4s)
- Continues on failure, reports all results at end

#### `gh_pr_review_issue`
Create a PR review issue with standard formatting.

**Parameters:**
- `title` (required): Issue title (without [PR Review] prefix)
- `milestone` (required): Milestone title
- `pr_number` (required): PR number this review is for
- `body` (required): Issue body (markdown)

**Returns:**
```json
{
  "number": 104,
  "url": "https://github.com/owner/repo/issues/104"
}
```

Automatically adds:
- `[PR Review]` prefix to title
- `pr-review` label
- "Source: Found during PR #X code review" to body

### Pi Server (unchanged)

Move from `pi-setup/mcp/` to `claude-inits/mcp/pi/` with no code changes.

**Existing tools (10):**
- `pi_docker_ps`, `pi_docker_logs`, `pi_docker_restart`, `pi_docker_stop`
- `pi_deploy`, `pi_read_file`, `pi_git_pull`
- `pi_reset_dev`, `pi_copy_prod_to_staging`, `pi_seed_dev`

### Shared Utilities

**`mcp/workflow/lib/github-api.js`:**
```javascript
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper with exponential backoff
async function withRetry(fn, { maxRetries = 3, baseDelay = 1000 } = {}) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
}

// Batch executor with delays and error collection
async function batchExecute(items, fn, { delayMs = 150 } = {}) {
  const results = { succeeded: [], failed: [] };
  for (const item of items) {
    try {
      await withRetry(() => fn(item));
      results.succeeded.push(item);
    } catch (err) {
      results.failed.push({ item, error: err.message });
    }
    if (item !== items[items.length - 1]) await sleep(delayMs);
  }
  results.summary = `${results.succeeded.length}/${items.length} processed successfully`;
  return results;
}

export { sleep, withRetry, batchExecute };
```

**`mcp/workflow/lib/exec.js`:**
```javascript
import { spawn } from "child_process";

// Promise wrapper for command execution
function exec(command, args = [], { timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { timeout });
    let stdout = "", stderr = "";

    proc.stdout.on("data", (data) => stdout += data.toString());
    proc.stderr.on("data", (data) => stderr += data.toString());

    proc.on("close", (code) => {
      if (code === 0) resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      else reject(new Error(stderr.trim() || `Exit code ${code}`));
    });

    proc.on("error", reject);
  });
}

// gh CLI wrapper
async function gh(args) {
  return exec("gh", args.split(" "));
}

export { exec, gh };
```

### Configuration

**Claude MCP config** (`~/.claude.json`):
```json
{
  "mcpServers": {
    "workflow": {
      "command": "node",
      "args": ["/Users/max/Gits/claude-inits/mcp/workflow/server.js"]
    },
    "pi": {
      "command": "node",
      "args": ["/Users/max/Gits/claude-inits/mcp/pi/server.js"]
    }
  }
}
```

## Migration Tasks

### Add
- [ ] Create `mcp/workflow/` with 5 tools
- [ ] Move `pi-setup/mcp/` to `mcp/pi/`
- [ ] Add MCP server entries to Claude config

### Remove
- [ ] Delete `scripts/` directory from claude-inits
- [ ] Delete `mcp/` directory from pi-setup
- [ ] Remove Helper Scripts sections from CLAUDE.md files (food-butler, spendee-visualiser, pi-setup)
- [ ] Remove script permissions from `~/.claude/settings.json`:
  - `Bash(/Users/max/.claude/scripts/*)`
  - `Bash(/Users/max/.claude/scripts/*.sh *)`
- [ ] Remove `~/.claude/scripts` symlink

### Update
- [ ] Add note to pi-setup/CLAUDE.md that MCP server moved to claude-inits

## Benefits

| Before | After |
|--------|-------|
| 7 scripts + 10 MCP tools | 15 MCP tools |
| Helper Scripts in 3+ CLAUDE.md files | No per-project documentation |
| Permission whitelist for scripts | MCP handles permissions |
| Manual invocation syntax | Auto-discovered schemas |
| No retry logic | Built-in retry with backoff |
| Basic error reporting | Structured success/failure results |
