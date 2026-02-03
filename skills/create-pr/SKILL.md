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
   - **Fix both critical AND reasonable minor issues** (not just critical ones)
   - Skip only trivial nitpicks (e.g., subjective style preferences with no clear benefit)
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

8. **Deploy to Staging:**
   - Deploy current branch to staging using MCP: `pi_deploy("[project]", "staging", "[branch]")`
   - Wait for container to be healthy
   - Report staging URL for manual testing

9. **Stop with Summary:**
   - PR URL
   - Code review: passed/issues fixed
   - Tests: passed/failed
   - E2E tests: passed/failed
   - Staging: deployed with URL
   - Cleanup actions reminder
   - "Ready for manual testing on staging. Run `/merge-pr` when ready to merge."

**Note:** This skill does NOT merge. Use `/merge-pr` after manual testing.

## Checklist

**CRITICAL: Follow this checklist in order. Execute all steps automatically without asking for confirmation between steps.**

### Pre-flight
- [ ] Verify on feature branch (not master)
- [ ] Check for uncommitted changes
- [ ] Verify branch is pushed to remote

### PR Creation
- [ ] Gather commits since branch diverged
- [ ] List all changed files
- [ ] Get linked issues from commits/milestone
- [ ] Get milestone and design doc link
- [ ] Create PR with title, description, linked issues

### Code Review Loop (repeat until approved)
- [ ] Invoke `superpowers:requesting-code-review` skill
- [ ] If issues found: create GitHub issue for EACH finding with `pr-review` label
- [ ] Fix ALL pr-review issues using `/start-issue` workflow
- [ ] Re-run review after fixes
- [ ] **Only exit loop when review passes with no new issues**

### Testing
- [ ] Run `/run-tests` - all tests must pass
- [ ] Deploy to dev: `pi_deploy("[project]", "dev", "[branch]")`
- [ ] Health check dev environment
- [ ] Run E2E tests
- [ ] Deploy to staging: `pi_deploy("[project]", "staging", "[branch]")`
- [ ] Health check staging environment

### Completion
- [ ] Output summary with PR URL, review status, test results, staging URL
- [ ] Remind user to run `/merge-pr` after manual testing

## Execution

**Preferred: MCP**
```
# Create PR with full metadata
mcp__workflow__gh_create_pr(
    title="PR Title",
    body="Description with ## Summary and ## Issues sections",
    base="master",
    milestone="Milestone Title",
    labels=["feature"]
)

# Create issues for review findings
mcp__workflow__gh_pr_review_issue(
    title="Finding title",
    body="Details of the issue",
    milestone="Milestone Title",
    pr_number=42
)
```

**Fallback: Bash**
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

# 6. Deploy to staging using MCP
pi_deploy("[project]", "staging", "$BRANCH")

# 7. Health check
curl --retry 10 --retry-delay 3 --retry-connrefused -s http://[project]-staging.home/api/health
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

### Staging
✅ Deployed to staging
- URL: http://[project]-staging.home

### Next Steps
1. Manual testing on staging: http://[project]-staging.home
2. When ready: `/merge-pr`

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

**Preferred: MCP**
```
# Get all issues in milestone with labels (filter for code-complete in code)
mcp__workflow__gh_milestone_issues(milestone="Phase 5: Variety Tracking", state="closed", label="code-complete")
```

**Fallback: Bash**
```bash
# Get closed issues for this milestone with code-complete label
gh issue list --milestone "Phase 5: Variety Tracking" --state closed --label "code-complete" --json number --jq '.[].number'
```

## Getting Design Doc for Review

Extract design doc path from milestone description:

**Preferred: MCP**
```
# Get milestone details including description
mcp__workflow__gh_milestone(action="find", identifier="Phase 5")
```
Parse the description field to extract design doc path.

**Fallback: Bash**
```bash
# Get milestone description and parse design doc link
gh api repos/:owner/:repo/milestones --jq '.[] | select(.title | contains("Phase 5")) | .description' | grep -oE '\./docs/plans/[^)]+\.md'
```

The design doc provides:
- Architectural decisions to verify implementation follows
- Data model designs to check against
- API contracts to validate
- UI/UX patterns to confirm
