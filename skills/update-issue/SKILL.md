---
name: update-issue
description: Update GitHub issue status (in-progress, code-complete)
user_invocable: true
arguments: "<issue-number-or-url> <status>"
---

# Update Issue

Update the workflow status of a GitHub issue.

## Usage

```
/update-issue 15 in-progress
/update-issue 15 code-complete
/update-issue #15 done
/update-issue https://github.com/owner/repo/issues/15 code-complete
```

## Argument Parsing

- First arg: Issue number (`15`, `#15`) or full GitHub URL
- Second arg: Status to set

## Status Transitions

| Status | Labels | Meaning |
|--------|--------|---------|
| `in-progress` | Add `in-progress` | Currently being worked on |
| `code-complete` | Remove `in-progress`, add `code-complete` | Done on feature branch, awaiting merge |
| `done` | Close issue | Merged to master (usually automatic via PR) |

## Execution

```bash
# Parse issue number from arg (handle URL or number)
ISSUE_NUMBER=...

# For in-progress
gh issue edit $ISSUE_NUMBER --add-label "in-progress"

# For code-complete
gh issue edit $ISSUE_NUMBER --remove-label "in-progress" --add-label "code-complete"

# For done (manual close - usually PR does this)
gh issue close $ISSUE_NUMBER
```

## Milestone Update

After updating an issue, check if milestone status should change:

```bash
# Get milestone for this issue
MILESTONE=$(gh issue view $ISSUE_NUMBER --json milestone --jq '.milestone.title')

# If first issue marked in-progress, milestone becomes [ACTIVE]
# Check current milestone title prefix and suggest update if needed
```

## Output Format

```
## Updated Issue #15

**Title:** Add retry suggestions endpoint
**Status:** in-progress → code-complete
**Milestone:** [ACTIVE] Phase 5: Variety Tracking

### Milestone Progress
- 4 of 6 issues complete
- 1 code-complete (this one)
- 1 remaining
```
