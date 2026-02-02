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
4. **Check for resume state** (verify commits match closed issues)
5. **Create task list** for user visibility
6. Execute in phases (parallel implementation → review → commit)
7. On completion: auto-create PR or prompt user if failures

## Task List for Progress Tracking

**IMPORTANT:** Always use `TaskCreate`/`TaskUpdate` so the user can see what's happening.

### Milestone Header Task

First, create a header task that shows which milestone is being executed:

```
TaskCreate:
  subject: "Milestone #5: Dashboard & Navigation Redesign"
  description: "Executing milestone #5 with 12 issues across 3 phases"
  activeForm: "Executing milestone #5"
  status: in_progress
```

This stays `in_progress` for the duration and gives the user context at a glance.

### When to Create Tasks

Create tasks at the START of each phase, before dispatching agents:

```
Phase 1 starts:
  TaskCreate: "Implement #70: Category breakdown"
  TaskCreate: "Implement #71: Collapsible section"
  TaskCreate: "Implement #72: Remove month selector"
```

### Task Lifecycle

| Event | Action |
|-------|--------|
| Dispatching agent | `TaskCreate` with `status: pending` |
| Agent starts work | `TaskUpdate` to `in_progress` |
| Agent completes | `TaskUpdate` to `completed` |
| Agent fails | `TaskUpdate` to `completed` with failure note |
| Starting review | `TaskCreate`: "Review Phase N changes" |
| Starting commits | `TaskCreate`: "Commit Phase N" |

### Task Format

```
TaskCreate:
  subject: "Implement #70: Category breakdown"
  description: "Implementing issue #70 for Phase 1"
  activeForm: "Implementing #70"

TaskUpdate:
  taskId: <id>
  status: "in_progress" | "completed"
```

### Example Task List View

User sees:
```
Tasks:
⏳ Milestone #5: Dashboard & Navigation Redesign (in_progress)
  ✓ Implement #70: Category breakdown
  ✓ Implement #71: Collapsible section
  ⏳ Implement #72: Remove month selector (in_progress)
  ○ Review Phase 1 changes (pending)
  ○ Commit Phase 1 (pending)
```

This gives the user:
- **Which milestone** is being worked on (title + number)
- **Real-time progress** on individual issues
- **Current phase** visibility

## GitHub Labels

| Label | Color | Meaning | Who Sets |
|-------|-------|---------|----------|
| `in-progress` | - | Agent is working on implementation | Agent (start) |
| `ready-for-review` | `#F9D0C4` | Agent done, tests pass, awaiting review & commit | Agent (end) |
| `code-complete` | - | Orchestrator committed, issue closed | Orchestrator |
| `blocked-failed` | `#B60205` | Failed after retry, skipped | Agent/Orchestrator |
| `pr-review` | `#FBCA04` | Issue created from PR code review findings | - |

**Label flow per issue:**
```
Agent phase:
  (none) → in-progress → ready-for-review
           [working]     [done, not committed]

Orchestrator phase:
  ready-for-review → code-complete (closed)
  [after commit]     [committed]

Failure path:
  in-progress → blocked-failed (on unrecoverable failure)
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

## Dependency Graph & Phase Execution

### Building the Graph

1. Parse milestone description for dependency tree (structured format)
2. Parse each issue body for `Blocked by: #X` lines
3. Validate both sources match, warn on mismatches
4. Group issues into phases based on dependencies

### Execution Model: Phase-Based with Checkpoints

**Why phases?** Parallel agents can conflict on git operations. Phase-based execution:
- Agents work in parallel without committing
- Orchestrator commits sequentially after phase review
- Each phase creates a checkpoint for crash recovery

```
Phase N:
  ┌─────────────────────────────────────────────────────────┐
  │ Step 1: Implementation (parallel agents, NO COMMITS)    │
  │   - Up to 3 agents work concurrently                    │
  │   - Each: implement → test → self-review                │
  │   - Mark ready-for-review when done                     │
  └─────────────────────────────────────────────────────────┘
                           ↓
  ┌─────────────────────────────────────────────────────────┐
  │ Step 2: Code Review (single fresh agent)                │
  │   - Fresh context, no implementation bias               │
  │   - Reviews ALL phase changes together                  │
  │   - Can catch cross-issue inconsistencies               │
  │   - Approve or request fixes                            │
  └─────────────────────────────────────────────────────────┘
                           ↓
  ┌─────────────────────────────────────────────────────────┐
  │ Step 3: Commit & Close (orchestrator, sequential)       │
  │   For each ready-for-review issue in phase:             │
  │     - git add <issue-files>                             │
  │     - git commit -m "(type): Summary\n\nRefs #N"        │
  │     - Mark code-complete + close issue                  │
  └─────────────────────────────────────────────────────────┘
                           ↓
                   ✓ CHECKPOINT - safe to resume from here

Phase N+1: (issues that were blocked by Phase N)
  ...
```

### Concurrency

- Maximum 3 concurrent implementation subagents per phase
- Review is single agent (sees full phase context)
- Commits are sequential (no git conflicts)

### Agent Responsibilities

**Implementation Agent (per issue):**
1. Mark issue `in-progress`
2. Implement (following TDD)
3. Run tests, verify passing
4. Self-review for completeness
5. Mark `ready-for-review`
6. **DO NOT commit or close issue**

**Review Agent (per phase):**
1. Review all changes from phase together
2. Check code quality, patterns, cross-issue consistency
3. Approve or list specific issues needing fixes
4. If fixes needed → orchestrator dispatches fix agents → re-review

**Fix Agent (dispatched when review requests changes):**
1. Receive specific feedback from reviewer
2. Make targeted fixes (only what reviewer requested)
3. Run tests to verify fix doesn't break anything
4. Mark ready-for-review again
5. **DO NOT commit**

**Orchestrator (this skill):**
1. Coordinate phases and agents
2. After review passes, commit each issue sequentially
3. Mark issues code-complete and close them
4. Track checkpoints for resume

## Resume & Crash Recovery

### State Sources

1. **GitHub labels** - Issue status (in-progress, ready-for-review, code-complete, blocked-failed)
2. **Git log** - Which issues have commits (`git log --oneline --grep="Refs #N"`)
3. **Issue state** - Open vs closed

### On Startup: State Assessment

**Step 1: Fetch all issue data**

**Preferred: MCP**
```
mcp__workflow__gh_milestone_issues(milestone="Milestone Name", state="all")
```

**Fallback: Bash**
```bash
gh issue list --milestone "Milestone Name" --state all --json number,title,labels,state
```

**Step 2: Check commits for each issue**

```bash
# For each issue number, check if commit exists
git log --oneline --grep="Refs #N" --grep="#N" | head -1
```

**Step 3: Categorize each issue**

| Label | Closed? | Has Commit? | State | Action |
|-------|---------|-------------|-------|--------|
| `code-complete` | Yes | Yes | ✓ Done | Skip |
| `code-complete` | Yes | No | ⚠ Inconsistent | Warn user, verify manually |
| `ready-for-review` | No | No | Review pending | Queue for review → commit |
| `ready-for-review` | No | Yes | ⚠ Inconsistent | Should be closed, fix labels |
| `in-progress` | No | - | Work incomplete | Dispatch recovery agent |
| `blocked-failed` | No | - | Failed | Skip (or `--retry-failed`) |
| *(none)* | No | - | Not started | Queue for implementation |

### Resume Output

Display clear status to user:

```
## Resume State for Milestone "Dashboard Redesign"

### Completed (skip)
✓ #65: Update dashboard route (committed: abc1234)
✓ #66: Add ongoing month data (committed: def5678)

### Ready for Review (need commit)
⏳ #70: Category breakdown - ready, needs review & commit
⏳ #71: Collapsible section - ready, needs review & commit

### In Progress (need recovery)
🔄 #72: Remove month selector - partial work found

### Not Started
○ #81: Dashboard integration tests
○ #82: Trends page tests

### Failed (skipped)
✗ #77: Drill-down links - blocked-failed

Resume from: Phase 2 (review pending issues, then continue)
```

### Recovery Actions by State

**`ready-for-review` issues:**
- Already implemented, tests passed, self-reviewed
- Dispatch review agent to review all pending changes
- After review passes, orchestrator commits and closes

**`in-progress` issues:**
- Check for partial work: `git status`, `git diff`, commits
- Dispatch recovery agent with context (see `recovery-prompt.md`)
- Agent continues work → marks ready-for-review
- Then proceeds to review → commit flow

**`blocked-failed` with `--retry-failed`:**
- Reset label to none
- Queue for fresh implementation attempt

## Completion & PR Handoff

### Final State Query

**Preferred: MCP**
```
mcp__workflow__gh_milestone_issues(milestone="Milestone Name", state="all")
```

**Fallback: Bash**
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

### Orchestrator Commit Loop

After review passes, the orchestrator commits each issue's changes sequentially.

**For each ready-for-review issue in the phase:**

```bash
# 1. Identify files for this issue (from agent's report or git diff analysis)
# Agent should have reported: "Files changed: src/dashboard.py, src/templates/dashboard.html"

# 2. Stage only this issue's files
git add src/dashboard.py src/templates/dashboard.html

# 3. Commit with reference to issue
git commit -m "$(cat <<'EOF'
(feat): Add ongoing month column to category breakdown

Refs #70

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# 4. Mark code-complete and close
mcp__workflow__gh_bulk_issues(action="close", issues=[70], label="code-complete")

# Or fallback:
gh issue edit 70 --remove-label "ready-for-review" --add-label "code-complete"
gh issue close 70
```

**Important:**
- Commit ONE issue at a time (not all changes in one commit)
- Each commit references its issue with `Refs #N`
- This allows resume to verify which issues are actually committed
- If commit fails (pre-commit hook), fix and retry before moving to next issue

### Label Updates (by agents)

**Preferred: MCP**
```
# Mark in-progress (agent starting work)
mcp__workflow__gh_update_issue(issue=15, add_labels=["in-progress"])

# Mark ready-for-review (agent finished, no commit)
mcp__workflow__gh_update_issue(issue=15, remove_labels=["in-progress"], add_labels=["ready-for-review"])
```

**Fallback: Bash**
```bash
# Mark in-progress
gh issue edit $ISSUE --add-label "in-progress"

# Mark ready-for-review
gh issue edit $ISSUE --remove-label "in-progress" --add-label "ready-for-review"
```

### Label Updates (by orchestrator)

**Preferred: MCP**
```
# Mark code-complete after committing (close issue)
mcp__workflow__gh_bulk_issues(action="close", issues=[15], label="code-complete")

# Mark blocked-failed (on unrecoverable failure)
mcp__workflow__gh_bulk_issues(action="unlabel", issues=[15], label="in-progress")
mcp__workflow__gh_bulk_issues(action="label", issues=[15], label="blocked-failed")
```

**Fallback: Bash**
```bash
# Mark code-complete after committing
gh issue edit $ISSUE --remove-label "ready-for-review" --add-label "code-complete"
gh issue close $ISSUE

# Mark blocked-failed
gh issue edit $ISSUE --remove-label "in-progress" --add-label "blocked-failed"
```

## Subagent Prompts

- `./implementer-prompt.md` - For implementation subagents (parallel, no commits)
- `./recovery-prompt.md` - For continuing in-progress work (no commits)
- `./phase-reviewer-prompt.md` - For reviewing all changes in a phase (single agent)
- `./fix-agent-prompt.md` - For addressing specific review feedback (no commits)

## Checklist

When starting/resuming a milestone:

### Setup Phase
- [ ] Parse milestone identifier (number, title, or URL)
- [ ] Fetch milestone details and parse branch name from description
- [ ] Detect current git state (branch, worktree, existing worktrees)
- [ ] **ASK USER about branching strategy using `AskUserQuestion`** (MANDATORY - never skip)
- [ ] Execute user's branch/worktree choice
- [ ] **Update milestone status from `[READY]` to `[ACTIVE]`** (if not already active)

### Resume Check
- [ ] Query all issues and their labels
- [ ] Check git log for commits referencing each issue
- [ ] Categorize issues by state (done, ready-for-review, in-progress, not-started)
- [ ] Display resume state to user
- [ ] Determine which phase to resume from

### Phase Execution (repeat for each phase)
- [ ] **Step 1: Implementation** - Dispatch parallel agents for unblocked issues
  - [ ] Agents mark in-progress → ready-for-review
  - [ ] Agents DO NOT commit
  - [ ] Wait for all agents to complete or fail
- [ ] **Step 2: Review** - Dispatch single review agent for phase
  - [ ] Reviewer checks all changes together
  - [ ] If approved → proceed to Step 3
  - [ ] If changes requested → Step 2a
- [ ] **Step 2a: Fix Loop** (only if review requests changes)
  - [ ] Dispatch fix agents for issues needing changes (parallel if independent)
  - [ ] Fix agents address specific feedback, mark ready-for-review
  - [ ] Re-run review (Step 2)
  - [ ] Repeat until approved
- [ ] **Step 3: Commit & Close** - Orchestrator commits sequentially
  - [ ] For each ready-for-review issue:
    - [ ] `git add <files>`
    - [ ] `git commit -m "(type): Summary\n\nRefs #N"`
    - [ ] Mark code-complete + close issue
  - [ ] ✓ CHECKPOINT - safe to resume from here
- [ ] Check for newly unblocked issues → next phase

### Completion
- [ ] Verify all issues are code-complete or blocked-failed
- [ ] On success: run `/create-pr`
- [ ] On partial failure: show summary and options
