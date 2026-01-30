---
name: merge-pr
description: Merge PR and cleanup (containers, branches, labels, milestone)
user_invocable: true
argument-hint: "(pr-number-or-url)"
---

# Merge PR

Merge an approved PR to master and perform full cleanup.

## Usage

```
/merge-pr                                              # Merge current branch's PR
/merge-pr 42                                           # Merge specific PR number
/merge-pr #42                                          # With hash prefix
/merge-pr https://github.com/owner/repo/pull/42        # Full URL
```

## Argument Parsing

- No argument: Find PR for current branch
- Number (`42`, `#42`): Use as PR number
- URL: Extract PR number from URL

## Pre-flight Checks

```bash
# Parse PR number from arg (handle URL, number, or current branch)
# If URL: extract number from path
# If number: use directly
# If none: find PR for current branch

# Get current branch (for cleanup later)
BRANCH=$(git branch --show-current)

# Find PR for this branch (if no arg provided)
PR_NUMBER=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

# Get PR details
gh pr view $PR_NUMBER --json title,url,milestone,body
```

## What This Does

1. **Show summary** for human confirmation:
   - PR title and URL
   - Linked issues
   - Milestone name
   - What cleanup will happen

2. **Ask for confirmation:**
   - "Merge this PR and perform cleanup? (y/n)"
   - **Do NOT proceed without explicit confirmation**

3. **On confirm, execute:**
   - Merge PR to master
   - Remove `code-complete` labels from linked issues
   - Close the milestone
   - Stop staging/dev containers on Pi
   - Delete remote feature branch
   - Switch local to master and pull
   - Delete local feature branch
   - Delete worktree if exists

## Execution

```bash
# 1. Merge PR
gh pr merge $PR_NUMBER --merge --delete-branch

# 2. Remove code-complete labels from linked issues
# Parse issue numbers from PR body (Fixes #X, #Y, #Z)
ISSUES=$(gh pr view $PR_NUMBER --json body --jq '.body' | grep -oE '#[0-9]+' | tr -d '#')
for ISSUE in $ISSUES; do
  gh issue edit $ISSUE --remove-label "code-complete"
done

# 3. Close milestone
MILESTONE=$(gh pr view $PR_NUMBER --json milestone --jq '.milestone.title')
if [ -n "$MILESTONE" ]; then
  MILESTONE_NUMBER=$(gh api repos/:owner/:repo/milestones --jq ".[] | select(.title == \"$MILESTONE\") | .number")
  gh api repos/:owner/:repo/milestones/$MILESTONE_NUMBER -X PATCH -f state="closed"
fi

# 4. Stop staging/dev containers
# Preferred: MCP
pi_docker_stop("butler-staging")
pi_docker_stop("butler-dev")
# Fallback: SSH
ssh max@pi.local "cd ~/pi-setup && docker compose --profile staging --profile dev stop"

# 5. Switch to master and pull
git checkout master
git pull

# 6. Delete local branch (already deleted remote via --delete-branch)
git branch -d $BRANCH

# 7. Delete worktree if exists
WORKTREE_PATH=".worktrees/${BRANCH#feature/}"
if [ -d "$WORKTREE_PATH" ]; then
  git worktree remove "$WORKTREE_PATH"
fi
```

## Confirmation Prompt

```
## Ready to Merge

**PR:** #42 - Add variety tracking features
**URL:** https://github.com/owner/repo/pull/42

**Issues to clean up:**
- #12 Settings schema extension
- #13 Retry endpoint
- #14 Widget component

**Milestone:** [ACTIVE] Phase 5: Variety Tracking (will be closed)

**Cleanup actions:**
- Merge PR to master
- Remove `code-complete` labels from issues
- Close milestone
- Stop staging/dev containers on Pi
- Delete branch `feature/phase5-variety-tracking`
- Switch local to master

Proceed? (This will merge to master)
```

## Output Format

```
## Merged Successfully

**PR:** #42 merged to master
**Commit:** abc1234

### Cleanup Complete
- [x] Removed `code-complete` label from #12, #13, #14
- [x] Closed milestone: Phase 5: Variety Tracking
- [x] Stopped staging/dev containers
- [x] Deleted branch: feature/phase5-variety-tracking
- [x] Switched to master and pulled
- [x] Removed worktree: .worktrees/phase5-variety-tracking

### What's Next
Run `/start-session` to see current project state.
```

## Error Handling

- If PR has merge conflicts: abort and report
- If SSH to Pi fails: continue with other cleanup, report warning
- If branch delete fails: report warning, continue
- If milestone close fails: report warning, continue

Always report what succeeded and what failed.
