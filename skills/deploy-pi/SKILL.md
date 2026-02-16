---
name: deploy-pi
description: Deploy food-butler or spendee to Pi environments
user_invocable: true
argument-hint: "[project] [environment] [branch]"
---

# Deploy to Pi

Deploy applications to the Raspberry Pi.

## Usage

```
/deploy-pi                                      # All prod from master
/deploy-pi food-butler prod                     # food-butler prod
/deploy-pi food-butler staging feature/phase5  # staging from branch
/deploy-pi food-butler dev feature/phase5      # dev from branch
```

## What This Does

1. Deploy to Pi using MCP or SSH
2. Run `./build.sh` with the specified arguments
3. Report success/failure

## Execution

**Preferred: Use Pi MCP tools** (if available):

```
pi_deploy("food-butler", "dev", "feature/phase5")
```

**Fallback: SSH** (if MCP not configured):

```bash
ssh max@pi.local "cd ~/pi-setup && ./build.sh $ARGS"
```

## Staging Data

For staging deployments, you'll be asked whether to wipe data before deploying:

- **Yes**: Runs `pi_copy_prod_to_staging` first, then deploys (fresh prod data + new code)
- **No**: Deploys only (preserves existing staging data)

To manually refresh staging data at any time:

**Preferred: MCP**
```
pi_copy_prod_to_staging("food-butler")
```

**Fallback: SSH**
```bash
ssh max@pi.local "~/pi-setup/scripts/copy-prod-to-staging.sh food-butler"
```

## Checklist

**Verify environment before deploying.**

### Pre-deploy Validation
- [ ] Confirm project: `food-butler` or `spendee`
- [ ] Confirm environment: `prod`, `staging`, or `dev`
- [ ] **For prod:** Verify this is intentional (user explicitly requested)
- [ ] **For staging/dev:** Verify branch argument is provided

### Pre-deploy (staging only)
- [ ] Ask user: "Wipe staging data with fresh prod copy before deploying?"
- [ ] If yes: run `pi_copy_prod_to_staging("$PROJECT")` first

### Deploy
- [ ] Use MCP (preferred): `pi_deploy("$PROJECT", "$ENV", "$BRANCH")`
- [ ] Or SSH fallback: `ssh max@pi.local "cd ~/pi-setup && ./build.sh $ARGS"`

### Post-deploy
- [ ] Verify deployment success from output

## Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Prod | http://butler.home | Production |
| Staging | http://butler-staging.home | Feature testing |
| Dev | http://butler-dev.home | E2E tests |
