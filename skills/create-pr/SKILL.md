---
name: create-pr
description: Create a pull request with AI review loop
user_invocable: true
argument-hint: "(#milestone) (base-branch) (--retest PR#) (--wipe)"
---

# Create PR

Create a pull request and run AI review loop.

## Usage

```
/create-pr                    # PR to master, auto-detect milestone from branch
/create-pr #5                 # PR to master, use milestone #5
/create-pr --wipe             # PR to master, wipe staging with prod data
/create-pr #5 --wipe          # PR to master, milestone #5, wipe staging
/create-pr master             # Explicit base branch
/create-pr --retest           # Redeploy + E2E only, auto-detect PR from branch
/create-pr --retest 42        # Redeploy + E2E only, explicit PR #42
/create-pr --retest --wipe    # Redeploy + E2E only, wipe staging with prod data
```

## Argument Parsing

- `#N` (optional): Milestone number (e.g., `#5`). Preferred over auto-detection from branch. When provided, skips milestone resolution via branch matching and uses this milestone directly. Also used to resolve the working directory — if on master, the milestone's `## Branch` field identifies which worktree to use.
- First positional arg (optional, non-`#` non-`--`): base branch (default: `master`)
- `--retest` flag: Skip PR creation, code review, and unit tests. Only deploy to dev → E2E → deploy to staging.
  - Use case: after fixing issues found during manual staging testing
  - Accepts optional PR number (e.g., `--retest 42`). When provided, uses the PR's `headRefName` to resolve the working directory (worktree or branch).
  - If no PR number: auto-detected from current branch (or resolved worktree). If on master with multiple worktrees, ask user to pick.
- `--wipe` flag: After deploying to staging, sync prod data to staging via `pi_copy_prod_to_staging`. Default: no wipe (staging data preserved).

## Pre-flight Checks

Before creating PR:

### 1. Resolve Working Directory (Worktree Awareness)

Claude Code's cwd may be the main repo (on master) while actual work lives in a worktree on a feature branch. Always resolve this first.

```bash
BRANCH=$(git branch --show-current)

if [ "$BRANCH" = "master" ]; then
  # List worktrees to find feature branches
  git worktree list
fi
```

**Resolution logic when on master:**

| Condition | Action |
|-----------|--------|
| `#N` milestone provided | Fetch milestone `#N`, extract `## Branch` from description, match to worktree |
| No `#N`, no worktrees | Error: "Cannot create PR from master" |
| No `#N`, one worktree | Use it automatically |
| No `#N`, multiple worktrees | Match against open milestone `## Branch` fields (see below) |

**Disambiguating multiple worktrees (no `#N`):** Check open milestones (not Backlog) via `mcp__workflow__gh_milestone(action="list")`. Parse each milestone's description for the `## Branch` field. Match against worktree branches. For backlog issues without a milestone, check issue bodies for `## Branch` metadata.

After resolving, set `PROJECT_DIR` to the worktree root (or main repo root if already on a feature branch):

```bash
PROJECT_DIR=$(git -C "<resolved-path>" rev-parse --show-toplevel)
```

**CRITICAL:** Pass `cwd=PROJECT_DIR` to ALL `mcp__workflow__*` tool calls throughout this skill. Run all `git` and `gh` commands with `-C "$PROJECT_DIR"` if Claude's cwd differs from `PROJECT_DIR`.

### 2. Verify Branch and Working State

```bash
# Check for uncommitted changes (in resolved directory)
git -C "$PROJECT_DIR" status --porcelain
# If output is non-empty → STOP and ask the user:
#   "There are uncommitted changes. Would you like to:
#    1. Commit them first
#    2. Stash them and proceed
#    3. Abort"
# Do NOT proceed until resolved.

# Verify branch is pushed
git -C "$PROJECT_DIR" log origin/$BRANCH..HEAD
```

### 3. Check for Open Manual Issues

Use the milestone number — either from `#N` argument or resolved from branch matching in step 1:

```
# If #N was provided, use it directly. Otherwise resolve from branch:
# mcp__workflow__gh_milestone(action="list")
# Parse milestone descriptions for ## Branch matching current branch

# Check for open manual issues
mcp__workflow__gh_milestone_issues(milestone=N, state="open")
# Filter for "manual" label
```

If open manual issues exist, **warn but proceed**:

```
Warning: Open manual issues in this milestone:
- #46: Run migration and validate data
- #48: Review enriched dataset

These won't block PR creation, but /merge-pr will block until they're closed.
Proceeding with PR creation...
```

## Standard Mode (default)

> **DO NOT run unit tests or `/run-tests`.** Pre-commit hooks already ran the full test suite when code was committed. This skill only runs E2E tests (which require a deployed environment).

1. **Gather context:**
   - List commits since branch diverged from base
   - List all changed files
   - Get linked issues from commits/branch name
   - Get milestone and its design doc link (for review context)

2. **Create PR:**
   - Generate title from commits/milestone
   - Generate description with summary and linked issues
   - Use `Fixes #X` syntax (issues are already closed via `update-issue`)

3. **Plan Audit + AI Review (parallel):**
   - Pre-compute diffs pinned to merge base via MCP: `mcp__workflow__git_diff(mode="stat")` and `mcp__workflow__git_diff(mode="full")`
   - **Large diff threshold:** If full diff > **1000 lines**, use large diff mode — pass only stat summary to agents, which pull per-file diffs on demand
   - Gather linked issue titles and acceptance criteria
   - Fetch design doc and implementation plan paths from milestone description
   - Dispatch **two agents in parallel:**
     - **Plan audit agent** using template in [`plan-audit-prompt.md`](plan-audit-prompt.md) — checks design doc + implementation plan vs actual changes
     - **Code review agent** using template in [`reviewer-prompt.md`](reviewer-prompt.md) — checks code quality, standards, spec compliance
   - **If plan audit finds gaps:** STOP and present gaps prominently to user. User must acknowledge each gap (accept as-is, defer to backlog issue, or fix now) before proceeding to deploy.

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

6. **Deploy to Dev and Run E2E Tests (E2E only — no unit tests):**
   - Detect project from current working directory
   - Reset dev data to ensure clean state: `pi_reset_dev("[project]")`
   - Deploy current branch to dev using MCP: `pi_deploy("[project]", "dev", "[branch]")`
   - Wait for container to be healthy
   - Run E2E tests: `npm --prefix frontend run test:e2e`
   - Stop dev container: `pi_docker_stop("$PROJECT-dev")` — no longer needed after E2E
   - If E2E tests fail: **STOP and prominently report the failures.** Do NOT assume they were broken before this PR — treat them as regressions caused by this branch until proven otherwise. Do not proceed to staging deployment.

7. **Deploy to Staging:**
   - Deploy current branch to staging using MCP: `pi_deploy("[project]", "staging", "[branch]")`
   - Wait for container to be healthy
   - If `--wipe`: sync prod data to staging: `pi_copy_prod_to_staging("[project]")`
   - Report staging URL for manual testing

8. **Stop with Summary:**
   - PR URL
   - Code review: passed/issues fixed
   - Tests: pre-commit verified / E2E passed
   - Staging: deployed with URL
   - **What to Test:** top-level functional changes to verify on staging — derived from linked issue titles and commit messages. Focus on user-facing behavior, not implementation details.
   - Cleanup actions reminder
   - "Ready for manual testing on staging. Run `/merge-pr` when ready to merge."

**Note:** This skill does NOT merge. Use `/merge-pr` after manual testing.

## Retest Mode (`--retest`)

Use after fixing issues found during manual staging testing. Skips PR creation, code review, and unit tests.

**Flow:**
1. Pre-flight checks (same as standard)
2. Push any new commits to remote
3. Reset dev data: `pi_reset_dev("[project]")`
4. Deploy to dev: `pi_deploy("[project]", "dev", "[branch]")`
5. Health check dev
6. Run E2E tests
7. Stop dev container: `pi_docker_stop("$PROJECT-dev")`
8. Deploy to staging: `pi_deploy("[project]", "staging", "[branch]")`
8a. If `--wipe`: `pi_copy_prod_to_staging("[project]")`
9. Health check staging
10. Report summary (E2E results + staging URL)

## Checklist

**CRITICAL: Follow this checklist in order. Execute all steps automatically without asking for confirmation between steps — EXCEPT for uncommitted changes, which require user input.**

**DO NOT run unit tests or `/run-tests` at any point. Only E2E tests are run in this skill.**

### Pre-flight
- [ ] Parse `#N` milestone arg — if provided, fetch milestone and extract `## Branch` from description
- [ ] Resolve working directory — if `#N` provided, match its `## Branch` to a worktree. Otherwise: if on master, check `git worktree list` for feature branch worktrees. Auto-select if one, match against milestone `## Branch` if multiple, error if none. Set `PROJECT_DIR` and pass `cwd=PROJECT_DIR` to ALL MCP calls.
- [ ] Verify on feature branch (not master)
- [ ] Check for uncommitted changes — **if any exist, STOP and ask the user** whether to commit, stash, or abort. Do not proceed until resolved.
- [ ] Verify branch is pushed to remote
- [ ] Check for open manual issues in milestone — warn if any exist, but proceed (merge will block)
- [ ] Parse `--retest` flag — if set, skip to Retest section
- [ ] Parse `--wipe` flag

### PR Creation (skip if `--retest`)
- [ ] Gather commits since branch diverged
- [ ] List all changed files
- [ ] Get linked issues from commits/milestone
- [ ] Get milestone and design doc link
- [ ] Create PR with title, description, linked issues

### Plan Audit + Code Review (skip if `--retest` — code review repeats until approved)
- [ ] Pre-compute diffs: `mcp__workflow__git_diff(mode="stat")` and `mcp__workflow__git_diff(mode="full")`
- [ ] Gather linked issue titles and acceptance criteria
- [ ] Fetch design doc and implementation plan paths from milestone description
- [ ] Dispatch **two agents in parallel:**
  - [ ] Plan audit agent using [`plan-audit-prompt.md`](plan-audit-prompt.md) template
  - [ ] Code review agent using [`reviewer-prompt.md`](reviewer-prompt.md) template
- [ ] **If plan audit found gaps: STOP and present to user.** User must acknowledge each gap (accept as-is, defer to backlog issue, or fix now) before proceeding to deploy.
- [ ] If code review issues found: create GitHub issue for EACH finding with `pr-review` label
- [ ] Fix ALL pr-review issues using `/start-issue` workflow
- [ ] Re-run code review after fixes (plan audit does NOT re-run)
- [ ] **Only exit loop when code review passes with no new issues**

### Deploy & E2E (always runs)
- [ ] Reset dev data: `pi_reset_dev("[project]")`
- [ ] Deploy to dev: `pi_deploy("[project]", "dev", "[branch]")`
- [ ] Health check dev environment
- [ ] Run E2E tests
- [ ] Stop dev container: `pi_docker_stop("$PROJECT-dev")` — no longer needed after E2E
- [ ] **If E2E tests failed, STOP. Report failures prominently. Do NOT deploy to staging.**
- [ ] Deploy to staging: `pi_deploy("[project]", "staging", "[branch]")`
- [ ] If `--wipe`: sync prod data: `pi_copy_prod_to_staging("[project]")`
- [ ] Health check staging environment

### Completion
- [ ] Output summary with PR URL, review status, test results, staging URL
- [ ] Include "What to Test" section — key functional changes derived from linked issues and commits, focused on user-facing behavior
- [ ] Remind user to run `/merge-pr` after manual testing

## Execution

**Preferred: MCP**
```
# Pre-compute diffs for review (pinned to merge-base)
# IMPORTANT: Always pass cwd=PROJECT_DIR (resolved in pre-flight)
mcp__workflow__git_diff(base="master", mode="stat", cwd=PROJECT_DIR)
mcp__workflow__git_diff(base="master", mode="full", cwd=PROJECT_DIR)

# Create PR with full metadata
mcp__workflow__gh_create_pr(
    title="PR Title",
    body="Description with ## Summary and ## Issues sections",
    base="master",
    milestone="Milestone Title",
    labels=["feature"],
    cwd=PROJECT_DIR
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
```

### Deploy to Dev and Run E2E

After PR is created (or immediately in `--retest` mode):

```bash
# 1. Detect project from current working directory
# - Contains "food-butler" → food-butler
# - Contains "spendee" → spendee

# 2. Get current branch
BRANCH=$(git branch --show-current)

# 3. Reset dev data for clean E2E state
pi_reset_dev("[project]")

# 4. Deploy to dev using MCP (preferred)
pi_deploy("[project]", "dev", "$BRANCH")

# 5. Health check
curl --retry 10 --retry-delay 3 --retry-connrefused -s http://[project]-dev.home/api/health

# 6. Run E2E tests
npm --prefix frontend run test:e2e

# 6a. Stop dev container (no longer needed after E2E)
pi_docker_stop("$PROJECT-dev")

# 7. Deploy to staging using MCP
pi_deploy("[project]", "staging", "$BRANCH")

# 7a. If --wipe: sync prod data to staging
pi_copy_prod_to_staging("[project]")

# 8. Health check
curl --retry 10 --retry-delay 3 --retry-connrefused -s http://[project]-staging.home/api/health
```

**If E2E tests fail:** STOP immediately. Report the failures prominently. Do NOT assume they were broken before this PR — treat them as regressions caused by this branch. Do NOT deploy to staging.

## Output Format

```
## PR Created

**URL:** https://github.com/owner/repo/pull/42
**Milestone:** [Phase 5: Variety Tracking](https://github.com/owner/repo/milestone/3)

### Code Review
Passed (2 rounds - fixed formatting issues)

### Tests
Pre-commit hooks verified unit tests pass
E2E: 12 passed

### Staging
Deployed to staging
- URL: http://[project]-staging.home

### What to Test
Summarize the key functional changes from linked issues and commits. Focus on
user-facing behavior — what the user should poke at on staging. Example:

- **Meal variety tracking** — meals now show a "last cooked" badge; verify it appears and updates
- **New filter bar** — recipe list has category filters; try each filter and check counts
- **Deleted items** — soft-delete replaces hard-delete; delete something and confirm it's recoverable

### Next Steps
1. Manual testing on staging: http://[project]-staging.home
2. When ready: `/merge-pr [PR#]`
3. If fixes needed after staging testing: fix, commit, then `/create-pr --retest [PR#]`

### Cleanup Actions (after merge)
- Merge PR to master
- Remove ready-for-review labels from issues
- Close milestone
- Stop staging container on Pi
```

## Retest Output Format

```
## Retest Complete

### E2E Tests
12 passed

### Staging
Re-deployed to staging
- URL: http://[project]-staging.home

### What to Test
Same format as standard mode — summarize key functional changes from the
original PR plus any new fixes applied since last staging deploy.

### Next Steps
1. Manual testing on staging: http://[project]-staging.home
2. When ready: `/merge-pr [PR#]`
```

## PR Description Template

```markdown
## Summary
- [Key change 1]
- [Key change 2]

## Issues
Fixes #12, #13, #14

## Test Plan
- [x] Unit tests pass (pre-commit hooks)
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
mcp__workflow__gh_milestone_issues(milestone=5, state="closed", label="code-complete")
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

### Getting Implementation Plan for Audit

Implementation plans live in `docs/plans/` or are linked from the milestone description alongside the design doc. Look for a `## Plan` or `## Implementation Plan` heading in the milestone description.

The implementation plan provides:
- Task breakdown with acceptance criteria per task
- File-level targets and scope boundaries
- Phased delivery structure (which tasks in which order)
