---
name: run-e2e
description: Deploy to dev environment and run E2E tests
user_invocable: true
arguments: "[branch]"
---

# Run E2E Tests

Deploy the current branch to dev environment and run the Playwright E2E test suite.

## Usage

```
/run-e2e              # Deploy current branch to dev and run tests
/run-e2e master       # Deploy specific branch
```

## What This Does

1. Detect project from current working directory
2. Deploy specified branch (default: current) to project's dev environment
3. Wait for container to be healthy
4. Run Playwright E2E tests against dev environment
5. Report pass/fail results

## Project Configuration

| Project | Dev URL | Deploy Command |
|---------|---------|----------------|
| food-butler | http://butler-dev.home | `./build.sh food-butler dev $BRANCH` |
| spendee | http://spendee-dev.home | `./build.sh spendee dev $BRANCH` |

## Execution Steps

### 1. Detect Project

Check current working directory for project name:
- Contains `food-butler` → food-butler
- Contains `spendee` → spendee
- Otherwise → error "Unknown project. Run from a project directory."

### 2. Get Branch

If branch argument provided, use it. Otherwise:
```bash
git branch --show-current
```

### 3. Deploy to Dev

**Preferred: MCP**
```
pi_deploy("$PROJECT", "dev", "$BRANCH")
```

**Fallback: SSH**
```bash
ssh max@pi.local "cd ~/pi-setup && ./build.sh $PROJECT dev $BRANCH"
```

Wait for success message.

### 4. Health Check

Wait for dev environment to be ready:
```bash
curl --retry 10 --retry-delay 3 --retry-connrefused -s http://$DEV_URL/api/health
```

### 5. Run E2E Tests

```bash
npm --prefix frontend run test:e2e
```

### 6. Report Results

- If all tests pass: "E2E tests passed. Ready to merge."
- If any fail: Show Playwright output with failure details.

## Error Handling

- **Project not detected:** "Unknown project. Run /run-e2e from a project directory (food-butler or spendee)."
- **No dev environment:** "Dev environment not configured for $PROJECT. See deployment-pipeline.md."
- **Deploy fails:** Show output and stop.
- **Tests fail:** Show Playwright output with failure details.

## Debugging Flaky Tests

Dev data persists between test runs. If tests are failing due to stale data from previous runs, reset dev data to fixtures:

**Preferred: MCP**
```
pi_reset_dev("food-butler")
```

**Fallback: SSH**
```bash
ssh max@pi.local "rm -rf /data/butler/dev/* && docker restart butler-dev"
```

This wipes the database and re-seeds from fixtures on container restart.

**When to reset:**
- Tests failing inconsistently (flaky)
- Tests expecting specific fixture data but finding modified data
- After debugging sessions that created test data
- Starting a fresh E2E testing cycle

## Prerequisites

- SSH access to Pi configured
- Pi reachable on network
- Playwright installed in project (`npm --prefix frontend install`)
