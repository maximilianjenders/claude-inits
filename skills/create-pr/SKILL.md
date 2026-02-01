---
name: create-pr
description: Create a pull request with AI review loop
user_invocable: true
argument-hint: "(base-branch)"
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
   - Use `Fixes #X` syntax (issues are already closed via `update-issue`)

3. **AI Review:**
   - Use `superpowers:requesting-code-review` skill
   - Provide context:
     - **Issue specs:** Acceptance criteria from linked issues
     - **Design doc:** Architecture/patterns from milestone's design doc (if exists)
     - **CLAUDE.md:** Project coding standards
   - Review for: spec compliance, design doc adherence, code quality, CLAUDE.md violations

4. **Create Issues for Review Findings:**
   - If review finds issues, create a GitHub issue for EACH finding
   - Add issues to the same milestone
   - Add `pr-review` label to distinguish from original scope
   - Format: `[PR Review] <finding title>`
   - Include in body: file, line, description, suggested fix

5. **Resolve Review Issues:**
   - For each `pr-review` issue, transition through normal workflow:
     - Mark `in-progress` → implement fix → mark `ready-for-review` → verify → mark `code-complete`
   - Use `/start-issue <number>` for each review issue
   - Push fixes to the PR branch
   - Continue until ALL `pr-review` issues are `code-complete`

6. **Run Tests (after all review issues resolved):**
   - Run `/run-tests` to verify all tests pass
   - If tests fail: create issue, fix, re-run

7. **Deploy to Dev and Run E2E Tests:**
   - Detect project from current working directory
   - Deploy current branch to dev using MCP: `pi_deploy("[project]", "dev", "[branch]")`
   - Wait for container to be healthy
   - Run E2E tests: `npm --prefix frontend run test:e2e`
   - If E2E tests fail: report failures (do not auto-fix)

6. **Stop with Summary:**
   - PR URL
   - Code review: passed/issues fixed
   - Tests: passed/failed
   - E2E tests: passed/failed
   - Cleanup actions reminder
   - "Ready for manual testing. Run `/merge-pr` when ready to merge."

**Note:** This skill does NOT merge. Use `/merge-pr` after manual testing.

## Execution

```bash
# Get commits for PR description
git log master..HEAD --oneline

# Get changed files
git diff --name-only master...HEAD

# Create PR
gh pr create --title "Title" --body "Description" --base master

# Run tests after review passes
# Use /run-tests skill
```

### Deploy to Dev and Run E2E

After PR is created and tests pass:

```bash
# 1. Detect project from current working directory
# - Contains "food-butler" → food-butler
# - Contains "spendee" → spendee

# 2. Get current branch
BRANCH=$(git branch --show-current)

# 3. Deploy to dev using MCP (preferred)
pi_deploy("[project]", "dev", "$BRANCH")

# 4. Health check
curl --retry 10 --retry-delay 3 --retry-connrefused -s http://[project]-dev.home/api/health

# 5. Run E2E tests
npm --prefix frontend run test:e2e
```

If E2E tests fail, report the failures but do not auto-fix. The user may need to investigate.

## Output Format

```
## PR Created

**URL:** https://github.com/owner/repo/pull/42

### Code Review
✅ Passed (2 rounds - fixed formatting issues)

### Tests
✅ All tests passing
- Backend: 24 passed
- Frontend: 18 passed

### E2E Tests
✅ All E2E tests passing
- 12 passed

### Next Steps
1. Deploy to staging: `/deploy-pi [project] staging`
2. Manual testing on staging: http://[project]-staging.home
3. When ready: `/merge-pr`

### Cleanup Actions (after merge)
- Merge PR to master
- Remove ready-for-review labels from issues
- Close milestone
- Stop dev container on Pi
- Stop staging container on Pi
```

## PR Description Template

```markdown
## Summary
- [Key change 1]
- [Key change 2]

## Issues
Fixes #12, #13, #14

## Test Plan
- [x] Unit tests pass (`/run-tests`)
- [x] E2E tests pass (dev environment)
- [ ] Manual testing on staging

## Milestone
[ACTIVE] Phase 5: Variety Tracking
```

**Note:** Use `Fixes` not `Closes` - issues are already closed when marked `code-complete`.

## Linking Issues

Parse milestone to find all `code-complete` issues (which are now closed):

```bash
# Get closed issues for this milestone with code-complete label
gh issue list --milestone "Phase 5: Variety Tracking" --state closed --label "code-complete" --json number --jq '.[].number'
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
