---
name: start-issue
description: Begin work on a GitHub issue
user_invocable: true
arguments: "<issue-number-or-url>"
---

# Start Issue

Prepare to work on a GitHub issue by reading context and setting up the environment.

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

## What This Does

1. **Fetch issue details** - Read title, description, acceptance criteria
2. **Check milestone** - Understand the broader context
3. **Check dependencies** - Are there blocking issues?
4. **Verify branch** - Are we on the right feature branch?
5. **Mark as in-progress** - Add the `in-progress` label

## Execution

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
```bash
# Check if we're in a worktree (git dir is a file, not directory)
if [ -f .git ]; then
  echo "In worktree: $(cat .git | sed 's/gitdir: //')"
else
  echo "In main working tree"
fi

# List existing worktrees
git worktree list

# Current branch
git branch --show-current
```

**Decision tree:**

| Current State | Milestone Has Branch | Action |
|--------------|---------------------|--------|
| In worktree for correct branch | - | ✓ Ready to work |
| In worktree for wrong branch | Yes | Warn: "You're in worktree for X, but issue is for Y" |
| On correct feature branch | - | ✓ Ready to work |
| On master | Yes | Ask: "Switch to `feature/X` or create worktree?" |
| On different feature branch | Yes | Ask: "Create worktree for parallel work, or switch branches?" |
| Worktree exists for target branch | Yes | Suggest: "Worktree exists at `.worktrees/X/` - use that?" |

**When to suggest worktree:**
- User is mid-work on another branch and wants to do parallel work
- Multiple issues from different milestones need simultaneous attention

**Default (no parallel work needed):**
- Just switch branches: `git checkout feature/branch-name`

### 2. Dependency Check
- Parse issue body for "Blocked by: #X" references
- Check if blocking issues are closed
- If blocked, warn: "This issue is blocked by #X (still open)"

### 3. Already In-Progress Check
- If issue already has `in-progress` label, note it
- Check if there are other `in-progress` issues (context switch warning)

## Output Format

```
## Starting Issue #15

**Title:** Add retry suggestions endpoint
**Milestone:** [ACTIVE] Phase 5: Variety Tracking
**Branch:** feature/phase5-variety-tracking ✓

### Description
[Issue description here]

### Acceptance Criteria
- [ ] Endpoint returns ingredients due for retry
- [ ] Respects configurable time windows
- [ ] Includes last exposure date

### Dependencies
- #14 Settings schema extension ✓ (closed)

### Status
✓ Marked as in-progress
```
