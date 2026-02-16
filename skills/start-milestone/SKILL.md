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
2. Setup branch/worktree (skip if already on correct branch for `[ACTIVE]` milestone)
3. **Update milestone status to `[ACTIVE]`** (if currently `[READY]`)
4. **Check for resume state** (verify commits match closed issues)
5. **Create task list** for user visibility
6. Execute in phases (parallel implementation → review → batch commit)
7. On completion: auto-create PR or prompt user if failures

## Continuous Execution

**CRITICAL: Execute all phases automatically without stopping to ask for confirmation.**

Once setup is complete and execution begins, proceed through ALL phases continuously:
- Do NOT stop after each phase to ask "Should I continue?"
- Do NOT ask for permission between phases
- Do NOT pause to confirm progress

**Only stop and ask the user when:**
1. **Clarification needed** - Ambiguous requirements, conflicting specs, or unclear implementation details
2. **Blocking error** - Something that cannot be automatically resolved (e.g., merge conflict requiring manual resolution)
3. **Security/destructive concern** - Actions that could cause data loss or security issues
4. **All issues complete** - At the end, when ready to create PR (or report failures)

The task list provides real-time visibility into progress - users can see what's happening without being interrupted.

## Context Loading Rules

**CRITICAL: The orchestrator coordinates — it does NOT need architectural context.**

- **Do NOT read the design/implementation plan document.** Extract its path from the milestone description and pass it to subagents, but never read it yourself. This saves 5-20k tokens.
- **From `gh_milestone_issues` response, extract ONLY:** issue numbers, titles, labels, and `Blocked by` lines from bodies. Do not analyze full issue bodies — pass them verbatim to subagents.
- **Pass `design_doc_path` to subagents** who need it (implementation agents and reviewers).

## Task List for Progress Tracking

**IMPORTANT:** Always use `TaskCreate`/`TaskUpdate` so the user can see what's happening.

### Milestone Header Task

Create a header task that shows which milestone is being executed:

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
| Starting commit | `TaskCreate`: "Commit Phase N" |

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

## GitHub Labels

| Label | Meaning | Set By |
|-------|---------|--------|
| `in-progress` | Agent is working on implementation | Agent (start) |
| `ready-for-review` | Agent done, tests pass, awaiting review & commit | Agent (end) |
| `code-complete` | Orchestrator committed, issue closed | Orchestrator |
| `blocked-failed` | Failed after retry, skipped | Agent/Orchestrator |
| `pr-review` | Issue created from PR code review findings | create-pr |

**Flow:** `(none) → in-progress → ready-for-review → code-complete (closed)`
**Failure:** `in-progress → blocked-failed`

## Argument Parsing

- First arg: Milestone identifier
  - Number: `5`, `#5`
  - Title: `"Phase 5: Variety Tracking"`
  - URL: `https://github.com/owner/repo/milestone/5`
- Optional flag: `--retry-failed` to retry blocked-failed issues

## Branch & Worktree Setup

### Step 1: Detect Current State

```
mcp__workflow__git_state()
```
Returns: branch, is_worktree, worktree_path, pr, worktrees[], matching_branches[]

### Step 2: Determine Branch Name

**If milestone is `[ACTIVE]`:** Parse the `## Branch` section from the milestone description (written by a previous run).

**If milestone is `[READY]` (fresh start):** Derive branch name from milestone title:
- Strip status prefix (`[READY] #23 `) and convert to kebab-case
- Example: `[READY] #23 In-App Feedback Button` → `feature/in-app-feedback-button`

### Step 3: Fast-Path or Ask User

**Fast-path (skip question):** If milestone is already `[ACTIVE]` AND we're on the correct branch (or in the correct worktree per `## Branch` section), skip the branching question and go straight to resume state check.

**Otherwise, ask the user:**

**CRITICAL: You MUST use `AskUserQuestion` when the fast-path doesn't apply.**

| Current State | Options to Present |
|---------------|-------------------|
| On `master` | 1. Create worktree for `feature/X` (Recommended) 2. Create branch `feature/X` and switch 3. Continue on master |
| On correct feature branch | 1. Continue on this branch (Recommended) 2. Create worktree instead |
| On wrong feature branch | 1. Create worktree for `feature/X` (Recommended) 2. Switch to `feature/X` 3. Need cleanup first |
| In worktree for correct branch | 1. Continue in this worktree (Recommended) 2. Return to main repo |
| In worktree for wrong branch | 1. Create new worktree for `feature/X` (Recommended) 2. Switch worktree |
| Worktree exists for target | 1. Use existing worktree at `.worktrees/X/` (Recommended) 2. Create fresh worktree 3. Work in current location |

### Step 4: Execute Choice

- If worktree chosen: invoke `/worktree create feature/branch-name`
- If branch chosen: `git checkout -b feature/branch-name` or `git checkout feature/branch-name`
- If continue chosen: proceed with current state

## Milestone Status Update

**Update milestone to `[ACTIVE]` and write branch info before dispatching any issues.**

### Title Update

```
# If title starts with [READY], rename to [ACTIVE]
mcp__workflow__gh_milestone(action="rename", identifier="5", new_title="[ACTIVE] #5 Milestone Title")
```

- Update from `[READY]` → `[ACTIVE]` when starting fresh execution
- **Skip if already `[ACTIVE]`** (crash recovery / fast-path scenario)
- Skip if `[SKETCH]` or `[SCOPED]` (shouldn't be executing these)

### Write Branch Info to Description

**On fresh start (not already `[ACTIVE]`)**, append a `## Branch` section to the milestone description so resume and other skills can find the worktree:

```
# Append to existing description
mcp__workflow__gh_milestone(action="edit", identifier="5", description="<existing description>\n\n## Branch\n- **Branch:** `feature/in-app-feedback-button`\n- **Worktree:** `.worktrees/in-app-feedback-button/`")
```

- Include worktree path only if a worktree was created
- If working directly on a branch (no worktree), omit the worktree line
- **Skip if already `[ACTIVE]`** — the `## Branch` section already exists from the previous run

## Dependency Graph & Phase Execution

### Building the Graph

Reuse data already fetched during startup — no additional API calls needed:

```
# These calls are already made during startup - reuse the results:
# mcp__workflow__gh_milestone(action="find", identifier="5")  → description has dependency tree, returns milestone number
# mcp__workflow__gh_milestone_issues(milestone=5, state="all")  → each issue body has "Blocked by: #X"

# Parse dependencies from the data you already have:
# 1. Milestone description → look for dependency tree / phase structure
# 2. Each issue's body → scan for "Blocked by: #X" or "Blocked by #X" lines
# 3. No additional API calls needed
```

### Execution Model

Phases provide checkpoints for crash recovery. Agents work in parallel without committing; the orchestrator commits in a single batch after phase review.

**Per phase:**
1. **Implementation** — Dispatch parallel agents (max 3). Each: implement → test → self-review → mark `ready-for-review`. Agents do NOT commit.
2. **Review** — Dispatch single review agent with pre-computed diffs. If changes requested → dispatch fix agents → re-review.
3. **Batch Commit** — Stage all phase files, single commit referencing all issues. Close all issues. This is the checkpoint.
4. **Context Summary** — Output a concise phase summary so auto-compaction knows what to keep. All implementation details, diffs, and review feedback from the phase can be discarded.

### Concurrency

- Maximum 3 concurrent implementation subagents per phase
- Review is single agent (sees full phase context)
- Commits are sequential (no git conflicts)

### File Conflict Detection

Before dispatching parallel agents within a phase, check for file overlap:
1. Scan each issue's description and acceptance criteria for file/component references
2. If two issues mention the same files, templates, or components → serialize them (dispatch sequentially, not in parallel)
3. When in doubt, serialize — the cost of a wasted parallel slot is lower than the cost of file conflicts

**DO NOT** parallelize conflicting issues with the plan to "clean up later." This wastes tokens and creates merge conflicts.

### Agent Responsibilities

**Implementation Agent (per issue):**
1. Mark issue `in-progress`
2. Implement (following TDD)
3. Run scoped tests (changed files only — pre-commit runs full suite)
4. Self-review for completeness
5. Mark `ready-for-review`
6. **DO NOT commit or close issue**

**Review Agent (per phase):**
1. Receive pre-computed diffs and agent summaries from orchestrator
2. Review all changes from phase together
3. Check code quality, patterns, cross-issue consistency
4. Only read individual files if diff is unclear or surrounding context needed
5. Approve or list specific issues needing fixes

**Fix Agent (dispatched when review requests changes):**
1. Receive specific feedback from reviewer
2. Make targeted fixes (only what reviewer requested)
3. Run tests to verify fix doesn't break anything
4. Mark ready-for-review again
5. **DO NOT commit**

**Orchestrator (this skill):**
1. Coordinate phases and agents
2. Pre-compute review context (diffs, agent summaries) before dispatching reviewer
3. After review passes, batch commit all phase changes in a single commit
4. Mark all phase issues code-complete and close them
5. Track checkpoints for resume

## Pre-Computed Review Context

**Before dispatching the review agent**, the orchestrator must prepare:

```bash
# 1. Stage all changes (including new files) so diff captures everything
git add -A

# 2. Capture diff summary (staged changes)
git diff --cached --stat

# 3. Capture full diff (staged changes)
git diff --cached

# 4. Collect agent summaries (what they built, files changed, self-review notes)
```

Leave changes staged — the batch commit step uses them directly.

> **Why stage first?** Bare `git diff` misses new/untracked files. Staging then using `--cached` ensures the reviewer sees ALL changes including new files created by implementation agents.

Pass ALL of this into the reviewer prompt. See `phase-reviewer-prompt.md` for the template.

## Resume & Crash Recovery

### State Sources

1. **GitHub labels** - Issue status (in-progress, ready-for-review, code-complete, blocked-failed)
2. **Git log** - Which issues have commits (`git log --oneline --grep="Refs #N"`)
3. **Issue state** - Open vs closed

### On Startup: State Assessment

**Step 1: Fetch all issue data**

```
mcp__workflow__gh_milestone_issues(milestone=5, state="all")
```

**Step 2: Check commits for each issue**

```bash
# For each issue number, check if commit exists
git log --oneline --grep="Refs #N" --grep="#N" | head -1
```

Note: With batch commits, one commit may reference multiple issues (e.g., `Refs #70, #71, #72`). The grep still works — it finds the commit containing each issue number.

**Step 3: Categorize each issue**

| Label | Closed? | Has Commit? | State | Action |
|-------|---------|-------------|-------|--------|
| `code-complete` | Yes | Yes | Done | Skip |
| `code-complete` | Yes | No | Inconsistent | Warn user, verify manually |
| `ready-for-review` | No | No | Review pending | Queue for review → commit |
| `ready-for-review` | No | Yes | Inconsistent | Should be closed, fix labels |
| `in-progress` | No | - | Work incomplete | Dispatch recovery agent |
| `blocked-failed` | No | - | Failed | Skip (or `--retry-failed`) |
| *(none)* | No | - | Not started | Queue for implementation |

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

```
mcp__workflow__gh_milestone_issues(milestone=5, state="all")
```

### Happy Path (All `code-complete`)

```
All 12 issues complete. Ready for PR. Run /create-pr when you're ready.
```

**Do NOT auto-invoke `/create-pr`.** Inform the user that all issues are complete and they can run `/create-pr` manually when ready.

### Partial Failure (Some `blocked-failed`)

```
## Milestone Summary

Complete: 10 issues
Failed: 2 issues
  - #15: Add retry endpoint (failed: tests not passing after retry)
  - #18: Widget component (failed: spec review rejected twice)

### Suggestions
1. Retry failed issues: `/start-milestone 5 --retry-failed`
2. Skip failures and create PR anyway: `/create-pr`
3. Fix manually, then resume: `/start-milestone 5`
```

## Execution

### Startup

```
# Fetch milestone details (by number or title) — returns milestone number
mcp__workflow__gh_milestone(action="find", identifier="5")

# Fetch all issues using milestone NUMBER from above (avoids title mismatch)
mcp__workflow__gh_milestone_issues(milestone=5, state="all")

# Extract design doc path from milestone description — DO NOT read it
# Pass design_doc_path to implementation agents and reviewer
```

### Orchestrator Batch Commit

After review passes, the orchestrator commits ALL phase changes in a single commit.

```bash
# 1. Changes are already staged from the pre-review diff step (git add -A)
#    Verify with: git diff --cached --stat

# 2. Single commit referencing all phase issues
git commit -m "$(cat <<'EOF'
(feat): Phase N - [summary of phase work]

Refs #70, #71, #72

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# 3. Close all issues and add code-complete label
mcp__workflow__gh_bulk_issues(action="close", issues=[70, 71, 72], label="code-complete")
```

**Why batch instead of per-issue commits:**
- Pre-commit hooks run the full test suite — batching means 1 run per phase instead of N
- Issues are still traceable via `Refs #N` in the commit message
- Resume still works: `git log --grep="Refs #70"` finds the batch commit

### Label Updates (by agents)

```
# Mark in-progress (agent starting work)
mcp__workflow__gh_update_issue(issue=15, add_labels=["in-progress"])

# Mark ready-for-review (agent finished, no commit)
mcp__workflow__gh_update_issue(issue=15, remove_labels=["in-progress"], add_labels=["ready-for-review"])
```

### Label Updates (by orchestrator)

```
# Mark code-complete after batch commit (close all phase issues)
mcp__workflow__gh_bulk_issues(action="close", issues=[70, 71, 72], label="code-complete")

# Mark blocked-failed (on unrecoverable failure)
mcp__workflow__gh_bulk_issues(action="unlabel", issues=[15], label="in-progress")
mcp__workflow__gh_bulk_issues(action="label", issues=[15], label="blocked-failed")
```

## Subagent Prompts

- `./implementer-prompt.md` - For implementation subagents (parallel, no commits)
- `./recovery-prompt.md` - For continuing in-progress work (no commits)
- `./phase-reviewer-prompt.md` - For reviewing all changes in a phase (single agent)
- `./fix-agent-prompt.md` - For addressing specific review feedback (no commits)

**When dispatching subagents, include:**
- `design_doc_path` — extracted from milestone description, so agents can read it if needed
- Full issue body (verbatim from `gh_milestone_issues`)
- Working directory path

## Checklist

When starting/resuming a milestone:

### Setup Phase
- [ ] Parse milestone identifier (number, title, or URL)
- [ ] Fetch milestone details and parse branch name from description
- [ ] Extract `design_doc_path` from milestone description (do NOT read it)
- [ ] Detect current git state (branch, worktree, existing worktrees)
- [ ] **Fast-path:** If milestone is `[ACTIVE]` AND on correct branch → skip to Resume Check
- [ ] **Otherwise:** Ask user about branching strategy using `AskUserQuestion`
- [ ] Execute user's branch/worktree choice
- [ ] **Update milestone status from `[READY]` to `[ACTIVE]`** (skip if already active)
- [ ] **Write `## Branch` section to milestone description** with branch name and worktree path (skip if already active)

### Resume Check
- [ ] Query all issues and their labels
- [ ] Check git log for commits referencing each issue
- [ ] Categorize issues by state (done, ready-for-review, in-progress, not-started)
- [ ] Display resume state to user
- [ ] Determine which phase to resume from

### Phase Execution (repeat for each phase - NO STOPPING BETWEEN PHASES)
- [ ] **Step 1: Implementation** - Dispatch parallel agents for unblocked issues
  - [ ] Check for file conflicts between issues — serialize if overlap detected
  - [ ] Pass `design_doc_path` and full issue body to each agent
  - [ ] Agents mark in-progress → implement → scoped tests → self-review → ready-for-review
  - [ ] Agents DO NOT commit
  - [ ] Wait for all agents to complete or fail
- [ ] **Step 2: Review** - Dispatch single review agent for phase
  - [ ] Stage all changes: `git add -A`
  - [ ] Pre-compute: run `git diff --cached --stat` and `git diff --cached`, collect agent summaries
  - [ ] Pass pre-computed diffs, agent summaries, and `design_doc_path` to reviewer
  - [ ] If approved → proceed to Step 3
  - [ ] If changes requested → dispatch fix agents → re-review (re-stage + re-diff before re-review)
- [ ] **Step 3: Batch Commit** - Orchestrator commits all phase changes at once
  - [ ] Changes already staged from Step 2
  - [ ] Single `git commit` with `Refs #N1, #N2, #N3`
  - [ ] `gh_bulk_issues(action="close", issues=[...], label="code-complete")`
  - [ ] CHECKPOINT - safe to resume from here
- [ ] **Step 4: Context Summary** - Output concise carry-forward state for auto-compaction
  - [ ] Output: phase number, issues closed, commit hash, remaining phases, next phase issues
  - [ ] All implementation details, diffs, review feedback, and agent outputs from this phase can be discarded
- [ ] **Immediately proceed to next phase** (do NOT ask user to continue)

### Completion
- [ ] Verify all issues are code-complete or blocked-failed
- [ ] On success: inform user to run `/create-pr` when ready (do NOT auto-invoke)
- [ ] On partial failure: show summary and options
