---
name: update-issue
description: Update GitHub issue status (in-progress, ready-for-review, code-complete, blocked-failed)
user_invocable: true
argument-hint: "<issue-number-or-url> <status>"
---

# Update Issue

Update the workflow status of a GitHub issue.

## Usage

```
/update-issue 15 in-progress
/update-issue 15 ready-for-review
/update-issue 15 code-complete
/update-issue #15 done
/update-issue 15 blocked-failed
/update-issue https://github.com/owner/repo/issues/15 code-complete
```

## Argument Parsing

- First arg: Issue number (`15`, `#15`) or full GitHub URL
- Second arg: Status to set

## Status Transitions

| Status | Labels | Issue State | Meaning |
|--------|--------|-------------|---------|
| `in-progress` | Add `in-progress` | Open | Currently being worked on |
| `ready-for-review` | Remove `in-progress`, add `ready-for-review` | Open | Implementation done, awaiting review |
| `code-complete` | Remove `ready-for-review`, add `code-complete` | **Closed** | Done on feature branch, awaiting merge |
| `blocked-failed` | Remove `in-progress`, add `blocked-failed` | Open | Subagent failed after retry, skipped |

**Why close on code-complete?** GitHub's milestone progress bar only counts closed issues. Closing issues when implementation is done (not when merged) makes the progress bar show actual work completion.

**Label flow:**
```
(none) → in-progress → ready-for-review → code-complete (closed)
                   ↘ blocked-failed (on failure)
```

The `code-complete` label distinguishes "done on branch" from "merged to master" (which has no label).

## Execution

```bash
# Parse issue number from arg (handle URL or number)
ISSUE_NUMBER=...

# For in-progress
gh issue edit $ISSUE_NUMBER --add-label "in-progress"

# For ready-for-review
gh issue edit $ISSUE_NUMBER --remove-label "in-progress" --add-label "ready-for-review"

# For code-complete (CLOSE the issue + add label)
gh issue edit $ISSUE_NUMBER --remove-label "ready-for-review" --add-label "code-complete"
gh issue close $ISSUE_NUMBER

# For blocked-failed
gh issue edit $ISSUE_NUMBER --remove-label "in-progress" --add-label "blocked-failed"
```

## Milestone Update

After updating an issue, check if milestone status should change:

```bash
# Get milestone for this issue
MILESTONE=$(gh issue view $ISSUE_NUMBER --json milestone --jq '.milestone.title')

# If first issue marked in-progress, milestone becomes [ACTIVE]
# Check if milestone is [READY] and should become [ACTIVE]
# Status prefixes: [SKETCH], [SCOPED], [READY], [ACTIVE]
```

## Output Format

```
## Updated Issue #15

**Title:** Add retry suggestions endpoint
**Status:** in-progress → code-complete (closed)
**Milestone:** [ACTIVE] Phase 5: Variety Tracking

### Milestone Progress
- 5 of 6 issues closed (4 merged, 1 code-complete)
- 1 remaining (open)
```
