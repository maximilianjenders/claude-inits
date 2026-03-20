---
name: start-issue
description: Begin work on a GitHub issue
user_invocable: true
argument-hint: "<issue-number-or-url>"
---

# Start Issue

Prepare to work on a GitHub issue by reading context, setting up the environment, and implementing the change.

## Usage

```
/start-issue 15
/start-issue #15
/start-issue https://github.com/owner/repo/issues/15
```

## Argument Parsing

Extract issue number from argument:
- `15` or `#15` → issue 15 in current repo
- `https://github.com/owner/repo/issues/15` → parse number from URL (also works with repo context)

## Modes

### Standalone Mode (default — when user runs `/start-issue` manually)

This is the normal interactive mode. You implement the issue, run scoped tests, but do NOT commit or run the full test suite. The user decides when to commit.

### Batch Mode (when dispatched from `/start-milestone`)

Batch mode is handled by `implementer-prompt.md` directly — `/start-issue` is NOT used in batch context.

## What This Does

1. **Fetch issue details** - Read title, description, acceptance criteria
2. **Check milestone** - Understand the broader context
3. **Check dependencies** - Are there blocking issues?
4. **Verify branch** - Are we on the right feature branch?
5. **Mark as in-progress** - Add the `in-progress` label
6. **Implement the issue** - Follow TDD, run scoped tests
7. **Self-review** - Check completeness and quality
8. **Report completion** - Summarize what was done, remind user to commit

## Execution

**Preferred: MCP**
```
# Get current git state (branch, worktrees)
mcp__workflow__git_state()

# Fetch issue details (title, body, labels, milestone, state)
mcp__workflow__gh_issue(action="view", issue=15)

# Add in-progress label
mcp__workflow__gh_bulk_issues(action="label", issues=[15], label="in-progress")
```

**Fallback: Bash**
```bash
# Fetch issue details
gh issue view $ISSUE_NUMBER

# Get milestone info
gh issue view $ISSUE_NUMBER --json milestone --jq '.milestone.title'

# Check current branch
git branch --show-current

# Add in-progress label
gh issue edit $ISSUE_NUMBER --add-label "in-progress"
```

## Pre-flight Checks

Before marking as in-progress:

### 1. Branch/Worktree Check

Detect current environment:

**Preferred: MCP**
```
mcp__workflow__git_state()
```
Returns: branch, is_worktree, worktree_path, pr, worktrees[], matching_branches[]

**Fallback: Bash**
```bash
git branch --show-current
git worktree list
```

**Decision tree:**

| Current State | Milestone Has Branch | Action |
|--------------|---------------------|--------|
| In worktree for correct branch | - | Ready to work |
| In worktree for wrong branch | Yes | Warn: "You're in worktree for X, but issue is for Y" |
| On correct feature branch | - | Ready to work |
| On master | Yes | Ask: "Switch to `feature/X` or create worktree?" |
| On different feature branch | Yes | Ask: "Create worktree for parallel work, or switch branches?" |
| Worktree exists for target branch | Yes | Suggest: "Worktree exists at `.worktrees/X/` - use that?" |

### 1b. Store Branch in Issue (Backlog items)

If the issue has no milestone or is in the `Backlog` milestone (i.e., no milestone with a `## Branch` field), append a `## Branch` section to the issue body so `/create-pr` can resolve the worktree later:

```
mcp__workflow__gh_update_issue(issue=15, body="<existing body>\n\n## Branch\n`feature/branch-name`")
```

Skip this if the issue already has a `## Branch` section or belongs to a milestone that has one.

### 2. Dependency Check
- Parse issue body for "Blocked by: #X" references
- Check if blocking issues are closed
- If blocked, warn: "This issue is blocked by #X (still open)"

### 3. Already In-Progress Check
- If issue already has `in-progress` label, note it
- Check if there are other `in-progress` issues (context switch warning)

### 4. Milestone Status Check
If the issue has a milestone with `[READY]` prefix:
- Check if any other issues in that milestone are `in-progress` or `code-complete`
- If this is the **first issue being worked on**, update milestone from `[READY]` to `[ACTIVE]`

```
# Get all issues in milestone (check for in-progress/code-complete labels)
mcp__workflow__gh_milestone_issues(milestone=5, state="all")

# If no active issues found, rename milestone to [ACTIVE]
mcp__workflow__gh_milestone(action="rename", identifier="5", new_title="[ACTIVE] Milestone Title")
```

## Implementation

After pre-flight checks pass:

1. **Read CLAUDE.md** for project commands and conventions
2. **Follow TDD** — write failing tests first, implement to pass
3. **Run scoped tests** — only tests relevant to your changes (pre-commit runs the full suite at commit time)
4. **Run linters/formatters**
5. **Self-review** — check completeness, quality, CLAUDE.md compliance

## Checklist

**Follow this checklist in order.**

### Context Gathering
- [ ] Parse issue number from argument (number, `#N`, or URL)
- [ ] Fetch issue details (title, body, labels, milestone)
- [ ] Read acceptance criteria from issue body

### Pre-flight Checks
- [ ] **Branch/Worktree Check** - Verify on correct feature branch or ask user
- [ ] **Store Branch in Issue** - If backlog item (no milestone or Backlog milestone), append `## Branch` to issue body so `/create-pr` can resolve worktree later
- [ ] **Dependency Check** - Parse "Blocked by: #X" and verify blocking issues are closed
- [ ] **Already In-Progress Check** - Note if issue already has label, warn about context switch
- [ ] **Milestone Status Check** - If `[READY]` and first issue, update to `[ACTIVE]`

### Implementation
- [ ] Mark issue as `in-progress` (add label)
- [ ] Read CLAUDE.md for project standards
- [ ] Write failing tests first (TDD)
- [ ] Implement to make tests pass
- [ ] Run scoped tests (changed files only)
- [ ] Run linters/formatters
- [ ] Self-review for completeness and quality

### Completion
- [ ] Mark `ready-for-review` (swap labels)
- [ ] Report: what implemented, files changed, test results
- [ ] **Commit** — stage changed files and commit using project commit format. The pre-commit hook runs the full test suite automatically.
- [ ] **Do NOT push** — remind user: "Committed. Review the diff and push when ready, or use `/create-pr` to open a pull request."

## Output Format

```
## Issue #15 Complete

**Title:** Add retry suggestions endpoint
**Milestone:** [ACTIVE] Phase 5: Variety Tracking
**Branch:** feature/phase5-variety-tracking

### What Was Implemented
- [Summary of changes]

### Files Changed
- src/api/routes.py
- src/models/retry.py
- tests/test_retry.py

### Tests
- Scoped tests: All passing (3 new, 2 modified)

### Self-Review
- All acceptance criteria met
- No issues found

### Next Steps
Committed. Review the diff and push when ready, or use `/create-pr` to open a pull request.
```
