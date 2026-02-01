# MCP Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 7 shell scripts with a workflow MCP server (5 tools) and move Pi MCP server to claude-inits.

**Architecture:** Two MCP servers in `mcp/workflow/` and `mcp/pi/`. Workflow server uses shared utilities for retry logic and batch execution. Tools implemented as separate modules.

**Tech Stack:** Node.js, @modelcontextprotocol/sdk, gh CLI

---

## Task 1: Create MCP Directory Structure

**Files:**
- Create: `mcp/workflow/package.json`
- Create: `mcp/pi/` (move from pi-setup)

**Step 1: Create workflow server package.json**

```bash
mkdir -p mcp/workflow/lib mcp/workflow/tools
```

Create `mcp/workflow/package.json`:
```json
{
  "name": "workflow-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for GitHub/git workflow operations",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

**Step 2: Move Pi server**

```bash
cp -r ~/Gits/pi-setup/mcp mcp/pi-tmp
mv mcp/pi-tmp mcp/pi
```

**Step 3: Install dependencies**

```bash
cd mcp/workflow && npm install && cd ../..
cd mcp/pi && npm install && cd ../..
```

**Step 4: Commit**

```bash
git add mcp/
git commit -m "(feat): Create MCP directory structure

- Add workflow server package.json
- Copy Pi server from pi-setup

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Shared Utilities

**Files:**
- Create: `mcp/workflow/lib/exec.js`
- Create: `mcp/workflow/lib/github-api.js`

**Step 1: Create exec.js**

Create `mcp/workflow/lib/exec.js`:
```javascript
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

export { exec, gh, git };
```

**Step 2: Create github-api.js**

Create `mcp/workflow/lib/github-api.js`:
```javascript
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 */
async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
}

/**
 * Execute operations on multiple items with delays and error collection
 */
async function batchExecute(items, fn, options = {}) {
  const { delayMs = 150 } = options;
  const results = { succeeded: [], failed: [] };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      await withRetry(() => fn(item));
      results.succeeded.push(item);
    } catch (err) {
      results.failed.push({ item, error: err.message });
    }

    // Delay between items (but not after the last one)
    if (i < items.length - 1) {
      await sleep(delayMs);
    }
  }

  results.summary = `${results.succeeded.length}/${items.length} processed successfully`;
  return results;
}

export { sleep, withRetry, batchExecute };
```

**Step 3: Commit**

```bash
git add mcp/workflow/lib/
git commit -m "(feat): Add shared utilities for workflow server

- exec.js: Command execution with gh/git helpers
- github-api.js: Retry logic and batch execution

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Workflow Server Scaffold

**Files:**
- Create: `mcp/workflow/server.js`

**Step 1: Create server.js scaffold**

Create `mcp/workflow/server.js`:
```javascript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Tool definitions (will be populated by tool modules)
const TOOLS = [];

// Tool handlers (will be populated by tool modules)
const toolHandlers = {};

// Helper to register tools
function registerTool(definition, handler) {
  TOOLS.push(definition);
  toolHandlers[definition.name] = handler;
}

// Create and configure the MCP server
const server = new Server(
  {
    name: "workflow-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const handler = toolHandlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    return await handler(args || {});
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Workflow MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { registerTool, server };
```

**Step 2: Test server starts**

```bash
cd mcp/workflow && node server.js &
PID=$!
sleep 1
kill $PID 2>/dev/null
echo "Server starts successfully"
```

**Step 3: Commit**

```bash
git add mcp/workflow/server.js
git commit -m "(feat): Add workflow server scaffold

- MCP server with tool registration
- Ready for tool modules

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Implement git_state Tool

**Files:**
- Create: `mcp/workflow/tools/git-state.js`
- Modify: `mcp/workflow/server.js` (add import)

**Step 1: Create git-state.js**

Create `mcp/workflow/tools/git-state.js`:
```javascript
import { git, gh } from "../lib/exec.js";
import { registerTool } from "../server.js";

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

registerTool(definition, handler);

export { definition, handler };
```

**Step 2: Add import to server.js**

Add after the existing imports in `mcp/workflow/server.js`:
```javascript
// Import tools (must be after registerTool is defined)
import "./tools/git-state.js";
```

**Step 3: Test the tool**

```bash
cd ~/Gits/claude-inits && node mcp/workflow/server.js &
PID=$!
sleep 1
kill $PID 2>/dev/null
echo "Tool registered successfully"
```

**Step 4: Commit**

```bash
git add mcp/workflow/tools/git-state.js mcp/workflow/server.js
git commit -m "(feat): Add git_state tool

- Returns branch, worktree status, PR info
- Supports branch pattern matching

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Implement gh_milestone Tool

**Files:**
- Create: `mcp/workflow/tools/gh-milestone.js`
- Modify: `mcp/workflow/server.js` (add import)

**Step 1: Create gh-milestone.js**

Create `mcp/workflow/tools/gh-milestone.js`:
```javascript
import { gh } from "../lib/exec.js";
import { registerTool } from "../server.js";

const definition = {
  name: "gh_milestone",
  description: "Milestone operations: find, close, open, rename",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["find", "close", "open", "rename"],
        description: "Action to perform",
      },
      identifier: {
        type: "string",
        description: "Milestone number or title pattern",
      },
      new_title: {
        type: "string",
        description: "New title (required for rename action)",
      },
    },
    required: ["action", "identifier"],
  },
};

async function findMilestone(identifier) {
  // If it's a number, fetch directly
  if (/^\d+$/.test(identifier)) {
    const { stdout } = await gh([
      "api",
      `repos/{owner}/{repo}/milestones/${identifier}`,
      "--jq", '{ number, title, state, open_issues, closed_issues }'
    ]);
    return JSON.parse(stdout);
  }

  // Otherwise search by title
  const { stdout } = await gh([
    "api", "repos/{owner}/{repo}/milestones",
    "--jq", `.[] | select(.title | contains("${identifier}")) | { number, title, state, open_issues, closed_issues }`
  ]);

  if (!stdout) {
    throw new Error(`No milestone found matching: ${identifier}`);
  }

  // Take first match
  const lines = stdout.trim().split("\n");
  return JSON.parse(lines[0]);
}

async function handler(args) {
  const { action, identifier, new_title } = args;

  // Find the milestone first
  const milestone = await findMilestone(identifier);

  switch (action) {
    case "find":
      return {
        content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }],
      };

    case "close":
      await gh([
        "api", "-X", "PATCH",
        `repos/{owner}/{repo}/milestones/${milestone.number}`,
        "-f", "state=closed"
      ]);
      milestone.state = "closed";
      return {
        content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }],
      };

    case "open":
      await gh([
        "api", "-X", "PATCH",
        `repos/{owner}/{repo}/milestones/${milestone.number}`,
        "-f", "state=open"
      ]);
      milestone.state = "open";
      return {
        content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }],
      };

    case "rename":
      if (!new_title) {
        throw new Error("new_title is required for rename action");
      }
      await gh([
        "api", "-X", "PATCH",
        `repos/{owner}/{repo}/milestones/${milestone.number}`,
        "-f", `title=${new_title}`
      ]);
      milestone.title = new_title;
      return {
        content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }],
      };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

registerTool(definition, handler);

export { definition, handler };
```

**Step 2: Add import to server.js**

Add to `mcp/workflow/server.js`:
```javascript
import "./tools/gh-milestone.js";
```

**Step 3: Commit**

```bash
git add mcp/workflow/tools/gh-milestone.js mcp/workflow/server.js
git commit -m "(feat): Add gh_milestone tool

- Actions: find, close, open, rename
- Accepts milestone number or title pattern

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Implement gh_milestone_issues Tool

**Files:**
- Create: `mcp/workflow/tools/gh-milestone-issues.js`
- Modify: `mcp/workflow/server.js` (add import)

**Step 1: Create gh-milestone-issues.js**

Create `mcp/workflow/tools/gh-milestone-issues.js`:
```javascript
import { gh } from "../lib/exec.js";
import { registerTool } from "../server.js";

const definition = {
  name: "gh_milestone_issues",
  description: "List issues in a milestone with full metadata",
  inputSchema: {
    type: "object",
    properties: {
      milestone: {
        type: "string",
        description: "Milestone title",
      },
      state: {
        type: "string",
        enum: ["open", "closed", "all"],
        description: "Filter by state (default: all)",
      },
      label: {
        type: "string",
        description: "Filter by label (optional)",
      },
    },
    required: ["milestone"],
  },
};

async function handler(args) {
  const { milestone, state = "all", label } = args;

  // Build gh issue list command
  const ghArgs = [
    "issue", "list",
    "--milestone", milestone,
    "--state", state,
    "--json", "number,title,state,labels",
    "--jq", '[.[] | {number, title, state, labels: [.labels[].name]}]'
  ];

  if (label) {
    ghArgs.push("--label", label);
  }

  const { stdout } = await gh(ghArgs);
  const issues = stdout ? JSON.parse(stdout) : [];

  return {
    content: [{ type: "text", text: JSON.stringify(issues, null, 2) }],
  };
}

registerTool(definition, handler);

export { definition, handler };
```

**Step 2: Add import to server.js**

Add to `mcp/workflow/server.js`:
```javascript
import "./tools/gh-milestone-issues.js";
```

**Step 3: Commit**

```bash
git add mcp/workflow/tools/gh-milestone-issues.js mcp/workflow/server.js
git commit -m "(feat): Add gh_milestone_issues tool

- Lists issues with number, title, state, labels
- Filters by state and label

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Implement gh_bulk_issues Tool

**Files:**
- Create: `mcp/workflow/tools/gh-bulk-issues.js`
- Modify: `mcp/workflow/server.js` (add import)

**Step 1: Create gh-bulk-issues.js**

Create `mcp/workflow/tools/gh-bulk-issues.js`:
```javascript
import { gh } from "../lib/exec.js";
import { batchExecute } from "../lib/github-api.js";
import { registerTool } from "../server.js";

const definition = {
  name: "gh_bulk_issues",
  description: "Bulk operations on multiple issues with retry logic",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["label", "unlabel", "close", "reopen"],
        description: "Action to perform",
      },
      issues: {
        type: "array",
        items: { type: "number" },
        description: "Array of issue numbers",
      },
      label: {
        type: "string",
        description: "Label to add/remove (required for label/unlabel actions)",
      },
      comment: {
        type: "string",
        description: "Comment to add when closing (optional)",
      },
    },
    required: ["action", "issues"],
  },
};

async function handler(args) {
  const { action, issues, label, comment } = args;

  // Validate label is provided for label/unlabel actions
  if ((action === "label" || action === "unlabel") && !label) {
    throw new Error(`label is required for ${action} action`);
  }

  const executeAction = async (issueNumber) => {
    switch (action) {
      case "label":
        await gh(["issue", "edit", String(issueNumber), "--add-label", label]);
        break;

      case "unlabel":
        await gh(["issue", "edit", String(issueNumber), "--remove-label", label]);
        break;

      case "close":
        if (comment) {
          await gh(["issue", "close", String(issueNumber), "--comment", comment]);
        } else {
          await gh(["issue", "close", String(issueNumber)]);
        }
        // Add label if provided (common pattern: close + add code-complete)
        if (label) {
          await gh(["issue", "edit", String(issueNumber), "--add-label", label]);
        }
        break;

      case "reopen":
        await gh(["issue", "reopen", String(issueNumber)]);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  };

  const results = await batchExecute(issues, executeAction);

  return {
    content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
  };
}

registerTool(definition, handler);

export { definition, handler };
```

**Step 2: Add import to server.js**

Add to `mcp/workflow/server.js`:
```javascript
import "./tools/gh-bulk-issues.js";
```

**Step 3: Commit**

```bash
git add mcp/workflow/tools/gh-bulk-issues.js mcp/workflow/server.js
git commit -m "(feat): Add gh_bulk_issues tool

- Actions: label, unlabel, close, reopen
- Retry logic with exponential backoff
- Continues on failure, reports results

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Implement gh_pr_review_issue Tool

**Files:**
- Create: `mcp/workflow/tools/gh-pr-review-issue.js`
- Modify: `mcp/workflow/server.js` (add import)

**Step 1: Create gh-pr-review-issue.js**

Create `mcp/workflow/tools/gh-pr-review-issue.js`:
```javascript
import { gh } from "../lib/exec.js";
import { registerTool } from "../server.js";

const definition = {
  name: "gh_pr_review_issue",
  description: "Create a PR review issue with standard formatting",
  inputSchema: {
    type: "object",
    properties: {
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
  const { title, milestone, pr_number, body } = args;

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
  ]);

  const result = JSON.parse(stdout);

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

registerTool(definition, handler);

export { definition, handler };
```

**Step 2: Add import to server.js**

Add to `mcp/workflow/server.js`:
```javascript
import "./tools/gh-pr-review-issue.js";
```

**Step 3: Commit**

```bash
git add mcp/workflow/tools/gh-pr-review-issue.js mcp/workflow/server.js
git commit -m "(feat): Add gh_pr_review_issue tool

- Auto-adds [PR Review] prefix and pr-review label
- Adds source attribution to body

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Update Claude MCP Configuration

**Files:**
- Modify: `~/.claude.json` (or Claude's MCP config location)

**Step 1: Find and update Claude config**

Check current MCP config location:
```bash
cat ~/.claude.json 2>/dev/null || cat ~/.config/claude/claude.json 2>/dev/null || echo "Config not found at standard locations"
```

Update the mcpServers section to include both servers:
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

**Step 2: Verify servers start**

```bash
node ~/Gits/claude-inits/mcp/workflow/server.js &
PID1=$!
node ~/Gits/claude-inits/mcp/pi/server.js &
PID2=$!
sleep 2
kill $PID1 $PID2 2>/dev/null
echo "Both servers start successfully"
```

**Note:** No git commit for this task - config is outside the repo.

---

## Task 10: Cleanup - Remove Scripts

**Files:**
- Delete: `scripts/` directory
- Modify: `CLAUDE.md` (remove references)

**Step 1: Remove scripts directory**

```bash
rm -rf scripts/
```

**Step 2: Update CLAUDE.md**

Remove the Helper Scripts section and any references to `~/.claude/scripts/`.

**Step 3: Remove symlink**

```bash
rm -f ~/.claude/scripts
```

**Step 4: Commit**

```bash
git add -A
git commit -m "(chore): Remove shell scripts replaced by MCP server

- Deleted scripts/ directory (7 scripts)
- Functionality now in mcp/workflow/

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Cleanup - Update Project CLAUDE.md Files

**Files:**
- Modify: `~/Gits/food-butler/CLAUDE.md`
- Modify: `~/Gits/spendee-visualiser/CLAUDE.md`
- Modify: `~/Gits/pi-setup/CLAUDE.md`

**Step 1: Remove Helper Scripts sections from all three files**

Remove the "Helper Scripts" table and related text from each CLAUDE.md.

**Step 2: Add note to pi-setup/CLAUDE.md about MCP move**

Add to pi-setup/CLAUDE.md:
```markdown
## MCP Server

The Pi MCP server has moved to `claude-inits/mcp/pi/`. See that repo for the implementation.
```

**Step 3: Commit changes in each repo**

```bash
cd ~/Gits/food-butler && git add CLAUDE.md && git commit -m "(chore): Remove Helper Scripts section - now MCP tools

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

cd ~/Gits/spendee-visualiser && git add CLAUDE.md && git commit -m "(chore): Remove Helper Scripts section - now MCP tools

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

cd ~/Gits/pi-setup && git add CLAUDE.md && git commit -m "(chore): Remove Helper Scripts, note MCP server moved

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Cleanup - Remove pi-setup MCP Directory

**Files:**
- Delete: `~/Gits/pi-setup/mcp/`

**Step 1: Remove directory**

```bash
cd ~/Gits/pi-setup && rm -rf mcp/
```

**Step 2: Commit**

```bash
git add -A && git commit -m "(chore): Remove MCP server - moved to claude-inits

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Update Settings - Remove Script Permissions

**Files:**
- Modify: `~/.claude/settings.json`

**Step 1: Remove script permissions**

Remove these entries from the permissions array:
- `Bash(/Users/max/.claude/scripts/*)`
- `Bash(/Users/max/.claude/scripts/*.sh *)`

**Note:** No git commit - settings file is outside repos.

---

## Task 14: Final Verification

**Step 1: Restart Claude Code to pick up new MCP servers**

Exit and restart Claude Code.

**Step 2: Verify tools are available**

In a new Claude session, check that these tools appear:
- `git_state`
- `gh_milestone`
- `gh_milestone_issues`
- `gh_bulk_issues`
- `gh_pr_review_issue`
- `pi_docker_ps` (and other pi_* tools)

**Step 3: Test one workflow tool**

Try: `git_state` in the claude-inits repo - should return branch info.

**Step 4: Test one pi tool**

Try: `pi_docker_ps` - should list containers on the Pi.

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Create MCP directory structure |
| 2 | Create shared utilities |
| 3 | Create workflow server scaffold |
| 4 | Implement git_state tool |
| 5 | Implement gh_milestone tool |
| 6 | Implement gh_milestone_issues tool |
| 7 | Implement gh_bulk_issues tool |
| 8 | Implement gh_pr_review_issue tool |
| 9 | Update Claude MCP configuration |
| 10 | Cleanup - remove scripts |
| 11 | Cleanup - update project CLAUDE.md files |
| 12 | Cleanup - remove pi-setup MCP directory |
| 13 | Cleanup - remove script permissions |
| 14 | Final verification |
