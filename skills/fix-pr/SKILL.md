---
name: fix-pr
description: Handle post-PR staging feedback and fixes
user_invocable: true
argument-hint: "<pr-number-or-url> (--implement) (#issue1 #issue2...)"
---

# Fix PR

Re-establish context and workflow discipline after clearing a context window mid-PR. Bridges the gap between `/create-pr` and `/create-pr --retest`.

## Usage

```
/fix-pr                            # Feedback mode: auto-detect PR from branch
/fix-pr 42                         # Feedback mode: explicit PR number
/fix-pr --implement                # Implement all open pr-review issues
/fix-pr --implement #101 #102      # Implement specific issues only
```

## Argument Parsing

- First positional arg (optional): PR number (`42`) or URL (`https://github.com/owner/repo/pull/42`). If omitted, auto-detect from current branch (see below).
- `--implement` flag: Switch to implement mode (default is feedback mode)
- `#N` args after `--implement`: Specific issue numbers to implement (optional, defaults to all open `pr-review` issues)

### Auto-detecting PR Number

When no PR number is provided, detect from context:

| Current State | Action |
|--------------|--------|
| On feature branch | `gh pr view --json number` from current branch |
| On master, one worktree | Use that worktree's branch to find PR |
| On master, multiple worktrees | List worktrees with their PRs, **ask user to pick** |
| No PR found | Error: "No open PR found. Specify PR number: `/fix-pr 42`" |

**Preferred: MCP**
```
mcp__workflow__gh_pr(action="view")  # omit pr= to use current branch
```

**Fallback: Bash**
```bash
gh pr view --json number --jq '.number'
```

When on master with multiple worktrees, list them with associated PRs:
```
Multiple worktrees found — which PR?
1. `.worktrees/phase5-variety-tracking/` → PR #42 (Add variety tracking)
2. `.worktrees/fix-import-flow/` → PR #51 (Fix import flow)
```
Use `AskUserQuestion` to let the user pick.

## Two Modes

### Mode 1: Feedback (default)

User has tested on staging and has feedback to report. This mode triages feedback into issues.

### Mode 2: Implement (`--implement`)

User wants to fix existing `pr-review` issues. This mode implements them using `/start-issue` workflow.

**Mode detection:** `--implement` flag present → implement mode. Otherwise → feedback mode.

## Context Recovery (both modes)

Before doing anything, recover full PR context:

### 1. Resolve Working Directory (Worktree Awareness)

Get the PR branch first, then find the matching worktree.

**Preferred: MCP**
```
# Get PR details — headRefName gives the branch
mcp__workflow__gh_pr(action="view", pr=42)

# Get current git state
mcp__workflow__git_state()
```

**Resolve PROJECT_DIR from PR branch:**

The PR's `headRefName` (e.g., `feature/phase5-variety-tracking`) maps to a worktree at `.worktrees/<name-without-feature-prefix>/` (e.g., `.worktrees/phase5-variety-tracking/`).

| Current State | Action |
|--------------|--------|
| Worktree exists for PR branch | Use it as `PROJECT_DIR` |
| Already on PR branch (no worktree) | Use current repo root as `PROJECT_DIR` |
| On master, no matching worktree | Check out PR branch or create worktree, then set `PROJECT_DIR` |

**CRITICAL:** Pass `cwd=PROJECT_DIR` to ALL `mcp__workflow__*` tool calls throughout this skill. Run all `git` and `gh` commands with `-C "$PROJECT_DIR"` if Claude's cwd differs from `PROJECT_DIR`.

### 2. Gather PR Context

```
# Get all pr-review issues in the milestone (pass cwd!)
mcp__workflow__gh_milestone_issues(milestone="Milestone Title", label="pr-review", cwd=PROJECT_DIR)
```

**Fallback: Bash**
```bash
gh -C "$PROJECT_DIR" pr view 42 --json title,body,milestone,headRefName,state
git -C "$PROJECT_DIR" branch --show-current
gh issue list --milestone "Milestone Title" --label "pr-review" --state all --json number,title,state,labels
```

**Display to user:**
```
## PR #42 Context

**Title:** Add variety tracking
**Branch:** feature/phase5-variety-tracking
**Milestone:** [ACTIVE] #5 Phase 5: Variety Tracking
**State:** Open

### Existing pr-review Issues
| # | Title | Status |
|---|-------|--------|
| #98 | [PR Review] Fix null check in retry | code-complete |
| #99 | [PR Review] Add missing test for stats | open |
```

## Feedback Mode

After displaying context, process the user's feedback.

### Step 1: Investigate

For each piece of feedback, read the relevant code to understand scope and impact.

### Step 2: Triage Complexity

For each piece of feedback, determine:

- **Simple** — Bug fix, UI tweak, obvious change with clear implementation path. Single file or small cross-file change.
- **Complex** — Ambiguous scope, architectural impact, multiple valid approaches, or touches many files.

### Step 3: Create Issues

**Simple feedback** — Create issue directly:

```
mcp__workflow__gh_bulk_issues(
    action="create",
    milestone="[ACTIVE] #5 Phase 5: Variety Tracking",
    new_issues=[
        {
            "title": "[PR Review] Fix null check in retry endpoint",
            "body": "## Summary\nThe retry endpoint crashes when...\n\n## Acceptance Criteria\n- [ ] Handle null ingredient gracefully\n- [ ] Add test for null case\n\n## Files\n- `backend/src/api/retry.py`\n- `backend/tests/test_retry.py`",
            "labels": ["pr-review"]
        }
    ]
)
```

**Complex feedback** — Plan first, then create issues:

1. Invoke `superpowers:brainstorming` to explore the problem space
2. Invoke `superpowers:writing-plans` to create implementation plan
3. Write plan to `docs/plans/YYYY-MM-DD-<fix-name>/` following `~/.claude/shared/plan-folder-structure.md` (use `<fix-name>` as the kebab-case feature name)
4. Create issues from the plan with `pr-review` label, following `create-milestone` issue patterns (bidirectional dependencies, acceptance criteria)

### Step 4: Output Summary

```
## Feedback Triaged

| # | Title | Type |
|---|-------|------|
| #101 | [PR Review] Fix null check in retry | Simple |
| #102 | [PR Review] Redesign stats aggregation | Planned |

### Plans Created
- `docs/plans/2026-02-12-stats-redesign/` (for #102)

### Next Steps
Run `/fix-pr <pr> --implement` to begin fixes.
```

Include the actual PR number in the suggestion (e.g., `/fix-pr 42 --implement`).

**STOP here.** Do NOT implement. The whole point is to create issues in a small context, then implement in a fresh one.

## Implement Mode

### Step 1: Gather Issues

After context recovery, collect the issues to implement:

```
# Get all open pr-review issues in the milestone
mcp__workflow__gh_milestone_issues(milestone="Milestone Title", state="open", label="pr-review")
```

If specific issue numbers were provided (`#101 #102`), filter to those. Otherwise take all open `pr-review` issues.

### Step 2: Check for Plans

For each issue, check if an implementation plan exists in `docs/plans/`:

```
# Look for plan references in issue body, or scan for recent plans
Glob: docs/plans/*/tasks/*.md
```

If plan files exist, read the relevant task files for implementation context.

### Step 3: Verify Branch

Already resolved during Context Recovery. `PROJECT_DIR` points to the correct worktree or repo root on the PR branch. All git/MCP operations use this directory.

### Step 4: Implement Each Issue

For each issue, follow the `/start-issue` implementation pattern (do NOT literally invoke the skill — implement inline):

1. Mark `in-progress` (add label)
2. Read issue details and any linked plan files
3. **Write a regression test first** — reproduce the reported bug in a test. The test MUST fail demonstrating the exact problem before any fix is attempted. This proves the bug is real and the test catches it.
4. Implement the fix — minimal code to make the regression test pass
5. Run scoped tests (changed files only)
6. Self-review
7. Mark `ready-for-review` (swap labels)

> **Why regression-test-first?** Staging feedback means someone found a real bug. The test reproduces it, the fix resolves it, and the test prevents it from recurring. A fix without a regression test is an unproven fix.

### Step 5: Commit

After all issues are implemented:

1. Stage all changes
2. Batch commit referencing all issues (use appropriate type — `fix` for bugs, `feat` for new functionality, `refactor` for restructuring):
   ```
   (fix) Refs #101, #102: Fix staging feedback

   - Fix null check in retry endpoint
   - Redesign stats aggregation
   ```
3. Push to PR branch

### Step 6: Mark Code-Complete

```
# Remove ready-for-review, then close with code-complete
mcp__workflow__gh_bulk_issues(action="unlabel", issues=[101, 102], label="ready-for-review")
mcp__workflow__gh_bulk_issues(action="close", issues=[101, 102], label="code-complete")
```

### Step 7: Output Summary

```
## Fixes Implemented

| # | Title | Status |
|---|-------|--------|
| #101 | [PR Review] Fix null check in retry | code-complete |
| #102 | [PR Review] Redesign stats aggregation | code-complete |

### Commit
abc1234 - (fix) Refs #101, #102: Fix staging feedback

### Next Steps
Run `/create-pr --retest 42` to deploy and verify.
**Milestone:** [ACTIVE] #5 Phase 5: Variety Tracking
```

Include the actual PR number in the command and milestone as context info.

## Checklist

**CRITICAL: Follow this checklist in order. Execute all steps automatically without asking for confirmation between steps.**

### Context Recovery (both modes)
- [ ] Parse PR number from argument — if not provided, auto-detect from current branch or worktree. If on master with multiple worktrees, ask user to pick.
- [ ] Fetch PR details via `mcp__workflow__gh_pr(action="view")` — extract `headRefName`
- [ ] Resolve working directory — map PR branch to worktree (`.worktrees/<branch-without-feature-prefix>/`). Set `PROJECT_DIR` and pass `cwd=PROJECT_DIR` to ALL MCP calls.
- [ ] Get current git state via `mcp__workflow__git_state(cwd=PROJECT_DIR)`
- [ ] Get existing `pr-review` issues via `mcp__workflow__gh_milestone_issues(cwd=PROJECT_DIR)`
- [ ] Display PR context summary to user
- [ ] Parse `--implement` flag — if set, skip to Implement section

### Feedback Mode
- [ ] Read user's feedback
- [ ] Investigate relevant code for each piece of feedback
- [ ] Triage each item: simple or complex?
- [ ] **Simple items:** Create `pr-review` issues directly via `mcp__workflow__gh_bulk_issues(action="create")`
- [ ] **Complex items:** `superpowers:brainstorming` → `superpowers:writing-plans` → write to `docs/plans/YYYY-MM-DD-<name>/` → create issues from plan
- [ ] All issues get `pr-review` label and are added to PR's milestone
- [ ] Output summary table (issue numbers, titles, simple vs planned)
- [ ] **STOP** — suggest `/fix-pr <pr> --implement` with the actual PR number

### Implement Mode
- [ ] Fetch open `pr-review` issues (or filter to specified numbers)
- [ ] Check for implementation plans in `docs/plans/` — read relevant task files
- [ ] For each issue: write regression test reproducing the bug FIRST → verify it fails → implement fix → verify it passes → scoped tests → ready-for-review
- [ ] Batch commit referencing all issues
- [ ] Push to PR branch
- [ ] Mark all issues `code-complete` (close + label)
- [ ] Output summary with commit hash
- [ ] Suggest: "Run `/create-pr --retest <PR#>` to deploy and verify" — include actual PR number in the command, milestone as context

## Execution

**Preferred: MCP**
```
# Context recovery — get PR branch first, then resolve worktree
mcp__workflow__gh_pr(action="view", pr=42)
# Map headRefName → .worktrees/<name>/ → set PROJECT_DIR
mcp__workflow__git_state(cwd=PROJECT_DIR)
mcp__workflow__gh_milestone_issues(milestone="Milestone Title", label="pr-review", cwd=PROJECT_DIR)

# Create pr-review issues (feedback mode)
mcp__workflow__gh_bulk_issues(
    action="create",
    milestone="[ACTIVE] #5 Phase 5: Variety Tracking",
    new_issues=[{
        "title": "[PR Review] Finding title",
        "body": "## Summary\n...\n\n## Acceptance Criteria\n- [ ] ...",
        "labels": ["pr-review"]
    }]
)

# Mark code-complete (implement mode)
mcp__workflow__gh_bulk_issues(action="unlabel", issues=[101, 102], label="ready-for-review")
mcp__workflow__gh_bulk_issues(action="close", issues=[101, 102], label="code-complete")
```

**Fallback: Bash**
```bash
# Context recovery
gh pr view 42 --json title,body,milestone,headRefName,state
git branch --show-current
gh issue list --milestone "Milestone Title" --label "pr-review" --state all

# Create issue (feedback mode)
gh issue create --title "[PR Review] Finding" --body "Details" --milestone "Milestone Title" --label "pr-review"

# Mark code-complete (implement mode)
gh issue close 101 --comment "Fixed in PR #42"
gh issue edit 101 --remove-label "ready-for-review" --add-label "code-complete"
```

## Output Format

### Feedback Mode
```
## PR #42 Feedback Triaged

**Milestone:** [ACTIVE] #5 Phase 5: Variety Tracking
**Branch:** feature/phase5-variety-tracking

### Issues Created
| # | Title | Type |
|---|-------|------|
| #101 | [PR Review] Fix null check in retry | Simple |
| #102 | [PR Review] Redesign stats aggregation | Planned |

### Plans Created
- `docs/plans/2026-02-12-stats-redesign/` (for #102)

### Next Steps
Run `/fix-pr <pr> --implement` to begin fixes.
```

Include the actual PR number in the suggestion.

### Implement Mode
```
## PR #42 Fixes Implemented

**Milestone:** [ACTIVE] #5 Phase 5: Variety Tracking
**Branch:** feature/phase5-variety-tracking

### Issues Fixed
| # | Title | Status |
|---|-------|--------|
| #101 | [PR Review] Fix null check in retry | code-complete |
| #102 | [PR Review] Redesign stats aggregation | code-complete |

### Commit
abc1234 - (fix) Refs #101, #102: Fix staging feedback

### Next Steps
Run `/create-pr --retest 42` to deploy and verify.
**Milestone:** [ACTIVE] #5 Phase 5: Variety Tracking
```
