---
name: create-pr
description: Create a pull request with AI review loop
user_invocable: true
arguments: "[base-branch]"
---

# Create PR

Create a pull request and run AI review loop.

## Usage

```
/create-pr           # PR to master (default)
/create-pr master    # Explicit base branch
```

## Pre-flight Checks

Before creating PR:

```bash
# Verify we're on a feature branch, not master
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "master" ]; then
  echo "Error: Cannot create PR from master"
  exit 1
fi

# Check for uncommitted changes
git status --porcelain

# Verify branch is pushed
git log origin/$BRANCH..HEAD
```

## What This Does

1. **Gather context:**
   - List commits since branch diverged from base
   - List all changed files
   - Get linked issues from commits/branch name
   - Get milestone and its design doc link (for review context)

2. **Create PR:**
   - Generate title from commits/milestone
   - Generate description with summary and linked issues
   - Use `Closes #X` syntax for auto-close

3. **AI Review Loop:**
   - Use `superpowers:requesting-code-review` skill
   - Provide context:
     - **Issue specs:** Acceptance criteria from linked issues
     - **Design doc:** Architecture/patterns from milestone's design doc (if exists)
     - **CLAUDE.md:** Project coding standards
   - Review for: spec compliance, design doc adherence, code quality, CLAUDE.md violations
   - If issues found: fix and push
   - Re-review until clean

4. **Report:**
   - PR URL
   - Review status
   - Next steps (manual testing, merge)

## Execution

```bash
# Get commits for PR description
git log master..HEAD --oneline

# Get changed files
git diff --name-only master...HEAD

# Create PR
gh pr create --title "Title" --body "Description" --base master

# After review passes
echo "PR ready for manual testing. Deploy to staging with:"
echo "/deploy-pi [project] staging $BRANCH"
```

## PR Description Template

```markdown
## Summary
- [Key change 1]
- [Key change 2]

## Issues
Closes #12, #13, #14

## Test Plan
- [ ] Unit tests pass (`/run-tests`)
- [ ] Manual testing on staging
- [ ] E2E tests pass (if configured)

## Milestone
[ACTIVE] Phase 5: Variety Tracking
```

## Linking Issues

Parse milestone to find all `code-complete` issues and include them:

```bash
# Get issues for this milestone with code-complete label
gh issue list --milestone "Phase 5: Variety Tracking" --label "code-complete" --json number --jq '.[].number'
```

## Getting Design Doc for Review

Extract design doc path from milestone description:

```bash
# Get milestone description and parse design doc link
gh api repos/:owner/:repo/milestones --jq '.[] | select(.title | contains("Phase 5")) | .description' | grep -oE '\./docs/plans/[^)]+\.md'
```

The design doc provides:
- Architectural decisions to verify implementation follows
- Data model designs to check against
- API contracts to validate
- UI/UX patterns to confirm
