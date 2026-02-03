---
name: start-issue
description: Begin work on a GitHub issue
user_invocable: true
argument-hint: "<issue-number-or-url>"
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

### 4. Milestone Status Check
If the issue has a milestone with `[READY]` prefix:
- Check if any other issues in that milestone are `in-progress` or `code-complete`
- If this is the **first issue being worked on**, update milestone from `[READY]` to `[ACTIVE]`

**Preferred: MCP**
```
# Get all issues in milestone (check for in-progress/code-complete labels)
mcp__workflow__gh_milestone_issues(milestone="[READY] Milestone Title", state="all")

# If no active issues found, rename milestone to [ACTIVE]
mcp__workflow__gh_milestone(action="rename", identifier="5", new_title="[ACTIVE] Milestone Title")
```

**Fallback: Bash**
```bash
# Get milestone title and number
MILESTONE_INFO=$(gh issue view $ISSUE_NUMBER --json milestone --jq '.milestone | "\(.number) \(.title)"')
MILESTONE_NUM=$(echo "$MILESTONE_INFO" | cut -d' ' -f1)
MILESTONE_TITLE=$(echo "$MILESTONE_INFO" | cut -d' ' -f2-)

# If milestone is [READY], check if we should activate it
if [[ "$MILESTONE_TITLE" == "[READY]"* ]]; then
  # Check for any in-progress or code-complete issues in this milestone
  ACTIVE_ISSUES=$(gh issue list --milestone "$MILESTONE_TITLE" --label "in-progress,code-complete" --json number --jq 'length')

  if [ "$ACTIVE_ISSUES" -eq 0 ]; then
    # This is the first issue - update milestone to [ACTIVE]
    NEW_TITLE="${MILESTONE_TITLE/\[READY\]/[ACTIVE]}"
    gh api "repos/:owner/:repo/milestones/$MILESTONE_NUM" --method PATCH -f title="$NEW_TITLE"
    echo "✓ Updated milestone to $NEW_TITLE"
  fi
fi
```

## Checklist

**Follow this checklist in order before marking as in-progress.**

### Context Gathering
- [ ] Parse issue number from argument (number, `#N`, or URL)
- [ ] Fetch issue details (title, body, labels, milestone)
- [ ] Read acceptance criteria from issue body

### Pre-flight Checks
- [ ] **Branch/Worktree Check** - Verify on correct feature branch or ask user
- [ ] **Dependency Check** - Parse "Blocked by: #X" and verify blocking issues are closed
- [ ] **Already In-Progress Check** - Note if issue already has label, warn about context switch
- [ ] **Milestone Status Check** - If `[READY]` and first issue, update to `[ACTIVE]`

### Start Work
- [ ] Mark issue as `in-progress` (add label)
- [ ] Output issue details and acceptance criteria
- [ ] Begin implementation (or hand off to agent)

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
