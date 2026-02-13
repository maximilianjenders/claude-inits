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
2. Reset dev data to ensure clean state: `pi_reset_dev("[project]")`
3. Deploy specified branch (default: current) to project's dev environment
4. Wait for container to be healthy
5. Run Playwright E2E tests against dev environment
6. Report pass/fail results

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

### 3. Reset Dev Data

Wipe previous test data to ensure clean fixtures:

**Preferred: MCP**
```
pi_reset_dev("$PROJECT")
```

**Fallback: SSH**
```bash
ssh max@pi.local "rm -rf /data/$PROJECT/dev/* && docker restart $PROJECT-dev"
```

### 4. Deploy to Dev

**Preferred: MCP**
```
pi_deploy("$PROJECT", "dev", "$BRANCH")
```

**Fallback: SSH**
```bash
ssh max@pi.local "cd ~/pi-setup && ./build.sh $PROJECT dev $BRANCH"
```

Wait for success message.

### 5. Health Check

Wait for dev environment to be ready:
```bash
curl --retry 10 --retry-delay 3 --retry-connrefused -s http://$DEV_URL/api/health
```

### 6. Run E2E Tests

```bash
npm --prefix frontend run test:e2e
```

### 7. Report Results

- If all tests pass: "E2E tests passed. Ready to merge."
- If any fail: Show Playwright output with failure details.

## Error Handling

- **Project not detected:** "Unknown project. Run /run-e2e from a project directory (food-butler or spendee)."
- **No dev environment:** "Dev environment not configured for $PROJECT. See deployment-pipeline.md."
- **Deploy fails:** Show output and stop.
- **Tests fail:** Show Playwright output with failure details.

## Debugging Flaky Tests

Dev data is automatically reset before each deploy (step 3). If tests are still flaky, you can manually reset without redeploying:

**Preferred: MCP**
```
pi_reset_dev("food-butler")
```

**Fallback: SSH**
```bash
ssh max@pi.local "rm -rf /data/butler/dev/* && docker restart butler-dev"
```

This wipes the database and re-seeds from fixtures on container restart.

## Checklist

**Follow these steps in order. Do not skip health check.**

### Setup
- [ ] Detect project from working directory (food-butler or spendee)
- [ ] Get branch (argument or `git branch --show-current`)

### Deploy
- [ ] Reset dev data: `pi_reset_dev("$PROJECT")`
- [ ] Deploy to dev: `pi_deploy("$PROJECT", "dev", "$BRANCH")`
- [ ] **Health check** (REQUIRED): `curl --retry 10 --retry-delay 3 http://$DEV_URL/api/health`
- [ ] Verify health check passes before proceeding

### Test
- [ ] Run E2E tests: `npm --prefix frontend run test:e2e`
- [ ] Capture test output

### Report
- [ ] If all pass: "E2E tests passed"
- [ ] If any fail: Show Playwright output with failure details
- [ ] If flaky: suggest `pi_reset_dev("$PROJECT")` to reset fixtures

## Prerequisites

- SSH access to Pi configured
- Pi reachable on network
- Playwright installed in project (`npm --prefix frontend install`)
