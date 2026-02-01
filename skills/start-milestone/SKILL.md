---
name: start-milestone
description: Execute all issues in a milestone using parallel subagents with crash recovery
user_invocable: true
argument-hint: "[milestone-number]"
---

# Start Milestone

Execute all issues in a GitHub milestone using parallel subagents with crash recovery, ending in PR creation.

## Usage

```
/start-milestone 5
/start-milestone "Phase 5: Variety Tracking"
/start-milestone https://github.com/owner/repo/milestone/5
/start-milestone 5 --retry-failed
```

## High-Level Flow

1. Parse milestone, fetch issues, build dependency graph
2. Setup branch/worktree
3. **Update milestone status to `[ACTIVE]`** (if currently `[READY]`)
4. Check for crash recovery (resume in-progress issues)
5. Execute issues in parallel (respecting dependencies)
6. On completion: auto-create PR or prompt user if failures

## GitHub Labels

| Label | Color | Meaning |
|-------|-------|---------|
| `in-progress` | - | Currently being worked on |
| `ready-for-review` | `#F9D0C4` | Implementation done, awaiting review |
| `code-complete` | - | Done on feature branch, waiting for PR merge |
| `blocked-failed` | `#B60205` | Subagent failed after retry, skipped |
| `pr-review` | `#FBCA04` | Issue created from PR code review findings |

**Label flow per issue:**
```
(none) → in-progress → ready-for-review → code-complete
                   ↘ blocked-failed (on failure)
```

## Argument Parsing

- First arg: Milestone identifier
  - Number: `5`, `#5`
  - Title: `"Phase 5: Variety Tracking"`
  - URL: `https://github.com/owner/repo/milestone/5`
- Optional flag: `--retry-failed` to retry blocked-failed issues

## Branch & Worktree Setup

**CRITICAL: You MUST use `AskUserQuestion` to ask about branching strategy before proceeding. Never skip this step.**

### Step 1: Detect Current State

**Preferred: MCP**
```
mcp__workflow__git_state()
```
Returns: branch, is_worktree, worktree_path, pr, worktrees[], matching_branches[]

**Fallback: Bash**
```bash
git branch --show-current
git worktree list
git rev-parse --is-inside-work-tree
git branch -r --list "origin/*" | grep -E "feature/"
```

### Step 2: Parse Branch Name

Parse from milestone description (`## Branch` section) to determine the target branch.

### Step 3: Ask User (MANDATORY)

**You MUST use `AskUserQuestion` to ask how to proceed.** Present options based on current state:

| Current State | Options to Present |
|---------------|-------------------|
| On `master` | 1. Create worktree for `feature/X` (Recommended) 2. Create branch `feature/X` and switch 3. Continue on master |
| On correct feature branch | 1. Continue on this branch (Recommended) 2. Create worktree instead |
| On wrong feature branch | 1. Create worktree for `feature/X` (Recommended) 2. Switch to `feature/X` 3. Need cleanup first |
| In worktree for correct branch | 1. Continue in this worktree (Recommended) 2. Return to main repo |
| In worktree for wrong branch | 1. Create new worktree for `feature/X` (Recommended) 2. Switch worktree |
| Worktree exists for target | 1. Use existing worktree at `.worktrees/X/` (Recommended) 2. Create fresh worktree 3. Work in current location |

**Example AskUserQuestion call:**
```
header: "Branch setup"
question: "How would you like to work on this milestone?"
options:
  - label: "Create worktree (Recommended)"
    description: "Isolated workspace at .worktrees/feature-x/"
  - label: "Create branch"
    description: "Switch current workspace to feature/x"
  - label: "Continue on master"
    description: "Work directly on master branch"
```

### Step 4: Execute Choice

- If worktree chosen: invoke `/worktree create feature/branch-name`
- If branch chosen: `git checkout -b feature/branch-name` or `git checkout feature/branch-name`
- If continue chosen: proceed with current state

## Milestone Status Update

**CRITICAL: Update milestone to `[ACTIVE]` before dispatching any issues.**

After branch/worktree setup is complete, check if the milestone needs status update:

**Preferred: MCP**
```
# Check current milestone title
mcp__workflow__gh_milestone(action="find", identifier="5")

# If title starts with [READY], rename to [ACTIVE]
mcp__workflow__gh_milestone(action="rename", identifier="5", new_title="[ACTIVE] #5 Milestone Title")
```

**Fallback: Bash**
```bash
# Get current milestone title
MILESTONE_TITLE=$(gh api repos/:owner/:repo/milestones/5 --jq '.title')

# If [READY], update to [ACTIVE]
if [[ "$MILESTONE_TITLE" == "[READY]"* ]]; then
  NEW_TITLE="${MILESTONE_TITLE/\[READY\]/[ACTIVE]}"
  gh api repos/:owner/:repo/milestones/5 --method PATCH -f title="$NEW_TITLE"
fi
```

**When to update:**
- Update from `[READY]` → `[ACTIVE]` when starting fresh execution
- Skip if already `[ACTIVE]` (crash recovery scenario)
- Skip if `[SKETCH]` or `[SCOPED]` (shouldn't be executing these)

## Dependency Graph & Parallel Execution

### Building the Graph

1. Parse milestone description for dependency tree (structured format)
2. Parse each issue body for `Blocked by: #X` lines
3. Validate both sources match, warn on mismatches

### Execution Model: Streaming Coordination

```
Initial: Find all issues with no blockers → dispatch up to 3 subagents
As each completes:
  → Update labels immediately
  → Check what's now unblocked
  → Dispatch newly ready issues (up to concurrency limit)
Repeat until all done or all remaining are blocked-failed
```

### Concurrency

- Maximum 3 concurrent subagents
- Dispatch new tasks as others complete

### Per-Issue Subagent Lifecycle

```
1. Mark issue `in-progress`
2. Implement (following TDD)
3. Self-review
4. Mark `ready-for-review`
5. Spec review subagent checks
6. Code quality review subagent checks
7. If both pass → mark `code-complete`
8. If fail after retry → mark `blocked-failed`, continue with others
```

## Crash Recovery

### State Storage

GitHub labels only (single source of truth, no local cache).

### On Startup Query

**Preferred: MCP** (single call returns all issues with labels)
```
mcp__workflow__gh_milestone_issues(milestone="Milestone Name", state="all")
```
Returns all issues with their labels - filter in code by label to determine state.

**Fallback: Bash**
```bash
gh issue list --milestone "Milestone Name" --label "in-progress"
gh issue list --milestone "Milestone Name" --label "ready-for-review"
gh issue list --milestone "Milestone Name" --label "code-complete"
gh issue list --milestone "Milestone Name" --label "blocked-failed"
```

### Recovery Logic

| Label Found | Recovery Action |
|-------------|-----------------|
| `in-progress` | Assess commits, dispatch subagent to continue |
| `ready-for-review` | Dispatch review subagents |
| `code-complete` | Already done, skip |
| `blocked-failed` | Skip (or ask user to retry with --retry-failed) |
| *(no label)* | Not started, queue for execution |

### Assessing Partial Work

For `in-progress` issues:
- Check commits mentioning issue number
- Check test status
- Provide context to recovery subagent: "Issue #X was in-progress. Commits found: [list]. Continue implementation."

## Completion & PR Handoff

### Final State Query

```bash
gh issue list --milestone "Milestone Name" --state all --json number,title,labels,state
```

### Happy Path (All `code-complete`)

```
✓ All 12 issues complete

Invoking /create-pr...
```

Automatically run `/create-pr`.

### Partial Failure (Some `blocked-failed`)

```
## Milestone Summary

✓ Complete: 10 issues
✗ Failed: 2 issues
  - #15: Add retry endpoint (failed: tests not passing after retry)
  - #18: Widget component (failed: spec review rejected twice)

### Suggestions
1. Retry failed issues: `/start-milestone 5 --retry-failed`
2. Skip failures and create PR anyway: `/create-pr`
3. Fix manually, then resume: `/start-milestone 5`
```

## Execution

### Startup

**Preferred: MCP**
```
# Fetch milestone details (by number or title)
mcp__workflow__gh_milestone(action="find", identifier="5")
# or
mcp__workflow__gh_milestone(action="find", identifier="Phase 5: Variety Tracking")

# Fetch all issues with full metadata (single call)
mcp__workflow__gh_milestone_issues(milestone="Milestone Name", state="all")
```

**Fallback: Bash**
```bash
# Parse milestone (handle number, title, or URL)
MILESTONE_NUMBER=...

# Fetch milestone details
gh api repos/:owner/:repo/milestones/$MILESTONE_NUMBER

# Fetch all issues
gh issue list --milestone $MILESTONE_NUMBER --state all --json number,title,body,labels
```

### Label Updates

**Preferred: MCP** (supports bulk operations)
```
# Mark in-progress
mcp__workflow__gh_bulk_issues(action="label", issues=[15], label="in-progress")

# Mark ready-for-review (remove old, add new in two calls)
mcp__workflow__gh_bulk_issues(action="unlabel", issues=[15], label="in-progress")
mcp__workflow__gh_bulk_issues(action="label", issues=[15], label="ready-for-review")

# Mark code-complete (remove label, then close)
mcp__workflow__gh_bulk_issues(action="unlabel", issues=[15], label="ready-for-review")
mcp__workflow__gh_bulk_issues(action="label", issues=[15], label="code-complete")
mcp__workflow__gh_bulk_issues(action="close", issues=[15])

# Mark blocked-failed
mcp__workflow__gh_bulk_issues(action="unlabel", issues=[15], label="in-progress")
mcp__workflow__gh_bulk_issues(action="label", issues=[15], label="blocked-failed")
```

**Fallback: Bash**
```bash
# Mark in-progress
gh issue edit $ISSUE --add-label "in-progress"

# Mark ready-for-review
gh issue edit $ISSUE --remove-label "in-progress" --add-label "ready-for-review"

# Mark code-complete
gh issue edit $ISSUE --remove-label "ready-for-review" --add-label "code-complete"

# Mark blocked-failed
gh issue edit $ISSUE --remove-label "in-progress" --add-label "blocked-failed"
```

## Subagent Prompts

- `./implementer-prompt.md` - For implementation subagents
- `./recovery-prompt.md` - For continuing in-progress work
- Reuse `spec-reviewer-prompt.md` and `code-quality-reviewer-prompt.md` from superpowers

## Checklist

When starting a milestone:

- [ ] Parse milestone identifier (number, title, or URL)
- [ ] Fetch milestone details and parse branch name from description
- [ ] Detect current git state (branch, worktree, existing worktrees)
- [ ] **ASK USER about branching strategy using `AskUserQuestion`** (MANDATORY - never skip)
- [ ] Execute user's branch/worktree choice
- [ ] **Update milestone status from `[READY]` to `[ACTIVE]`** (MANDATORY - do this before dispatching issues)
- [ ] Query all issues and their labels (recovery check)
- [ ] Build dependency graph from issue bodies
- [ ] Dispatch root tasks (no blockers) up to concurrency limit
- [ ] As tasks complete, dispatch newly unblocked tasks
- [ ] Handle failures (mark blocked-failed, continue)
- [ ] On completion, run `/create-pr` or show failure summary
