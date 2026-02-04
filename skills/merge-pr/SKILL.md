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

**Preferred: MCP**
```
# Get current git state (includes branch)
mcp__workflow__git_state()

# If no PR number provided, find PR for current branch
mcp__workflow__gh_pr(action="list", head="$BRANCH", limit=1)

# Get PR details
mcp__workflow__gh_pr(action="view", pr=42)
# Or view current branch's PR (omit pr param):
mcp__workflow__gh_pr(action="view")
```

**Fallback: Bash**
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

## Checklist

**CRITICAL: Follow this checklist in order. Do not skip steps.**

### Pre-merge (requires user confirmation)
- [ ] Show summary: PR title, URL, linked issues, milestone
- [ ] **Get explicit user confirmation** before proceeding

### Documentation (MANDATORY)
- [ ] **Invoke `/update-docs` skill** - this is NOT optional
- [ ] If docs updated: `git commit -m "(docs): Update documentation for PR #N"`

### Merge
- [ ] Merge PR to master (`gh pr merge --merge --delete-branch`)

### Cleanup (execute all, report failures)
- [ ] Remove `code-complete` labels from linked issues
- [ ] Close the milestone
- [ ] Stop staging container: `pi_docker_stop("$PROJECT-staging")`
- [ ] Stop dev container: `pi_docker_stop("$PROJECT-dev")`
- [ ] Remove worktree if exists (must happen before branch delete)
- [ ] Switch to master and pull
- [ ] Delete local feature branch

### Deploy
- [ ] Deploy to production: `pi_deploy("$PROJECT", "prod")`
- [ ] **If prod deploy fails: report prominently** (this is critical)

## What This Does

1. **Show summary** for human confirmation:
   - PR title and URL
   - Linked issues
   - Milestone name
   - What cleanup will happen

2. **Ask for confirmation:**
   - "Merge this PR and perform cleanup? (y/n)"
   - **Do NOT proceed without explicit confirmation**

3. **MANDATORY: Update documentation:**
   - **Invoke `/update-docs` skill** before merging
   - This updates CLAUDE.md and README.md based on PR changes
   - If docs are updated, commit them to the branch before merging

4. **Execute merge and cleanup:**
   - Merge PR to master
   - Remove `code-complete` labels from linked issues
   - Close the milestone
   - Stop staging/dev containers on Pi
   - Delete remote feature branch
   - Remove worktree if exists (must happen before branch delete)
   - Switch local to master and pull
   - Delete local feature branch
   - Deploy to production

## Execution

```bash
# 1. Update documentation (invoke /update-docs skill)
# This will update CLAUDE.md and README.md based on PR changes
# and stage any modifications
```

**IMPORTANT:** Before proceeding with merge, invoke the `/update-docs` skill. This ensures documentation is updated based on all changes in the PR. If docs are updated, commit them to the branch before merging.

**Preferred: MCP for GitHub operations**
```
# If update-docs made changes, commit them (use git)
git diff --cached --quiet || git commit -m "(docs): Update documentation for PR #$PR_NUMBER"

# 2. Merge PR
mcp__workflow__gh_merge_pr(pr=42, method="merge", delete_branch=true)

# 3. Remove code-complete labels from linked issues (bulk operation)
mcp__workflow__gh_bulk_issues(action="unlabel", issues=[12, 13, 14], label="code-complete")

# 4. Close milestone
mcp__workflow__gh_milestone(action="close", identifier="5")

# 5. Stop staging/dev containers
mcp__pi__pi_docker_stop(container="butler-staging")
mcp__pi__pi_docker_stop(container="butler-dev")

# 6-8. Git cleanup (use git commands)
# IMPORTANT: Remove worktree BEFORE deleting branch (branch can't be deleted while checked out in worktree)
git worktree remove ".worktrees/${BRANCH#feature/}"  # if exists, do this first
git checkout master
git pull
git branch -d $BRANCH

# 9. Deploy to production
mcp__pi__pi_deploy(app="food-butler", env="prod")
# or
mcp__pi__pi_deploy(app="spendee", env="prod")
```

**Fallback: Bash**
```bash
# If update-docs made changes, commit them
git diff --cached --quiet || git commit -m "(docs): Update documentation for PR #$PR_NUMBER"

# 2. Merge PR
gh pr merge $PR_NUMBER --merge --delete-branch

# 3. Remove code-complete labels from linked issues
# Parse issue numbers from PR body (Fixes #X, #Y, #Z)
ISSUES=$(gh pr view $PR_NUMBER --json body --jq '.body' | grep -oE '#[0-9]+' | tr -d '#')
for ISSUE in $ISSUES; do
  gh issue edit $ISSUE --remove-label "code-complete"
done

# 4. Close milestone
MILESTONE=$(gh pr view $PR_NUMBER --json milestone --jq '.milestone.title')
if [ -n "$MILESTONE" ]; then
  MILESTONE_NUMBER=$(gh api repos/:owner/:repo/milestones --jq ".[] | select(.title == \"$MILESTONE\") | .number")
  gh api repos/:owner/:repo/milestones/$MILESTONE_NUMBER -X PATCH -f state="closed"
fi

# 5. Stop staging/dev containers (SSH fallback)
ssh max@pi.local "cd ~/pi-setup && docker compose --profile staging --profile dev stop"

# 6. Remove worktree if exists (MUST happen before branch delete)
# Branch can't be deleted while checked out in a worktree
WORKTREE_PATH=".worktrees/${BRANCH#feature/}"
if [ -d "$WORKTREE_PATH" ]; then
  git worktree remove "$WORKTREE_PATH"
fi

# 7. Switch to master and pull
git checkout master
git pull

# 8. Delete local branch (already deleted remote via --delete-branch)
git branch -d $BRANCH

# 9. Deploy to production (SSH fallback)
ssh max@pi.local "cd ~/pi-setup && ./build.sh food-butler prod"
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

**Pre-merge steps:**
1. Run `/update-docs` to update documentation

**Post-merge cleanup:**
- Remove `code-complete` labels from issues
- Close milestone
- Stop staging/dev containers on Pi
- Delete branch `feature/phase5-variety-tracking`
- Switch local to master
- Deploy to production

Proceed? (This will run /update-docs, then merge and deploy to prod)
```

## Output Format

```
## Merged Successfully

**PR:** #42 merged to master
**Commit:** abc1234

### Cleanup Complete
- [x] Updated documentation (CLAUDE.md, README.md)
- [x] Removed `code-complete` label from #12, #13, #14
- [x] Closed milestone: Phase 5: Variety Tracking
- [x] Stopped staging/dev containers
- [x] Removed worktree: .worktrees/phase5-variety-tracking
- [x] Switched to master and pulled
- [x] Deleted branch: feature/phase5-variety-tracking
- [x] Deployed to production

### What's Next
Run `/start-session` to see current project state.
```

## Error Handling

- If PR has merge conflicts: abort and report
- If SSH to Pi fails: continue with other cleanup, report warning
- If branch delete fails: report warning, continue
- If milestone close fails: report warning, continue
- If prod deploy fails: report error prominently (this is critical)

Always report what succeeded and what failed.
