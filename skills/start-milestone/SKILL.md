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

## Git Commands in Worktrees

**CRITICAL: ALL git commands MUST use `git -C <worktree-path>`. NEVER use `cd <path> && git ...`.**

Compound `cd` commands trigger permission prompts and are blocked by a PreToolUse hook. The orchestrator runs from the project root, not the worktree, so every git command needs `-C`:

```bash
# CORRECT
git -C /path/to/.worktrees/my-branch add -A
git -C /path/to/.worktrees/my-branch commit -m "message"
git -C /path/to/.worktrees/my-branch diff --cached --stat

# WRONG — triggers permission prompt
cd /path/to/.worktrees/my-branch && git add -A
```

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
| `manual` | Requires human interaction, skipped by agents | Plan author / Agent (fallback) |

**Flow:** `(none) → in-progress → ready-for-review → code-complete (closed)`
**Failure:** `in-progress → blocked-failed`
**Manual:** `manual` (skipped during automated execution, handled interactively after)

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
1. **Implementation** — Filter out issues labeled `manual` (they are skipped entirely). Dispatch parallel agents (max 3) for remaining issues. Each: implement → test → self-review → mark `ready-for-review`. Agents do NOT commit.
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
# All git commands use -C to target the worktree. NEVER use cd && git.
# 1. Stage all changes (including new files) so diff captures everything
git -C <worktree-path> add -A

# 2. Capture diff summary (staged changes)
git -C <worktree-path> diff --cached --stat

# 3. Capture full diff (staged changes)
git -C <worktree-path> diff --cached

# 4. Collect agent summaries (what they built, files changed, self-review notes)
```

Leave changes staged — the batch commit step uses them directly.

> **Why stage first?** Bare `git diff` misses new/untracked files. Staging then using `--cached` ensures the reviewer sees ALL changes including new files created by implementation agents.

**Large diff threshold:** If the full diff exceeds **1000 lines**, switch to large diff mode — pass only the `--stat` summary (not the full diff) into the reviewer prompt. The reviewer will pull per-file diffs on demand using `git diff --cached -- <file>`. This prevents large diffs from crowding out instructions and review context.

Pass ALL of this into the reviewer prompt. See `phase-reviewer-prompt.md` for the template.

## Resume & Crash Recovery

**Fresh start** (milestone `[READY]` and no issue carries a status label): skip — nothing to recover.

**Otherwise** (milestone `[ACTIVE]`, or any issue labelled `in-progress` / `ready-for-review` / `code-complete` / `blocked-failed`, or `--retry-failed`): read `~/.claude/skills/start-milestone/resume.md` for state assessment and recovery actions before dispatching anything.

## Completion, PR Handoff & Manual Tasks

After the last automated phase is committed — or on a re-run where all automated issues are already `code-complete` — read `~/.claude/skills/start-milestone/completion.md` and follow it. **Never auto-invoke `/create-pr`.**

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
#    Verify with: git -C <worktree-path> diff --cached --stat

# 2. Single commit referencing all phase issues
#    IMPORTANT: Use git -C, never cd && git. Use multiple -m flags, never heredocs.
git -C <worktree-path> commit -m "(feat): Phase N - [summary of phase work]" -m "Refs #70, #71, #72

Co-Authored-By: Claude <noreply@anthropic.com>"

# 3. Close all issues and add code-complete label
mcp__workflow__gh_bulk_issues(action="close", issues=[70, 71, 72], label="code-complete")
```

**Why batch instead of per-issue commits:**
- Pre-commit hooks run the full test suite — batching means 1 run per phase instead of N
- Issues are still traceable via `Refs #N` in the commit message
- Resume still works: `git log --grep="Refs #70"` finds the batch commit

Batch commits are the documented exception in `~/.claude/shared/plan-execution.md` — they are only acceptable because the phase reviewer verifies each issue's acceptance criteria individually against the shared diff.

### Label Updates (by orchestrator)

Agents set `in-progress` / `ready-for-review` themselves (see the subagent prompt templates).

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
- [ ] Fresh start (`[READY]`, no status labels on any issue) → skip to Phase Execution
- [ ] Otherwise: read `~/.claude/skills/start-milestone/resume.md`, categorize issues, display resume state, determine resume phase

### Phase Execution (repeat for each phase - NO STOPPING BETWEEN PHASES)
- [ ] **Step 1: Implementation** - Dispatch parallel agents for unblocked issues
  - [ ] Check for file conflicts between issues — serialize if overlap detected
  - [ ] Pass `design_doc_path` and full issue body to each agent
  - [ ] Agents mark in-progress → implement → scoped tests → self-review → ready-for-review
  - [ ] Agents DO NOT commit
  - [ ] Wait for all agents to complete or fail
- [ ] **Step 2: Review** - Dispatch single review agent for phase
  - [ ] Stage all changes: `git -C <worktree-path> add -A`
  - [ ] Pre-compute: run `git -C <worktree-path> diff --cached --stat` and `git -C <worktree-path> diff --cached`, collect agent summaries
  - [ ] Pass pre-computed diffs, agent summaries, and `design_doc_path` to reviewer
  - [ ] If approved → proceed to Step 3
  - [ ] If changes requested → dispatch fix agents → re-review (re-stage + re-diff before re-review)
- [ ] **Step 3: Batch Commit** - Orchestrator commits all phase changes at once
  - [ ] Changes already staged from Step 2
  - [ ] Single `git -C <worktree-path> commit` with `Refs #N1, #N2, #N3`
  - [ ] `gh_bulk_issues(action="close", issues=[...], label="code-complete")`
  - [ ] CHECKPOINT - safe to resume from here
- [ ] **Step 4: Context Summary** - Output concise carry-forward state for auto-compaction
  - [ ] Output: phase number, issues closed, commit hash, remaining phases, next phase issues
  - [ ] All implementation details, diffs, review feedback, and agent outputs from this phase can be discarded
- [ ] **Immediately proceed to next phase** (do NOT ask user to continue)

### Completion
- [ ] Read `~/.claude/skills/start-milestone/completion.md` and follow it (final state query, manual task loop, `/create-pr #N` suggestion with manual-issue reminder, partial-failure summary)
- [ ] Do NOT auto-invoke `/create-pr`
