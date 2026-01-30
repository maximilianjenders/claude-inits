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

## Refreshing Staging Data

After deploying to staging, you may want fresh prod data:

**Preferred: MCP**
```
pi_copy_prod_to_staging("food-butler")
```

**Fallback: SSH**
```bash
ssh max@pi.local "~/pi-setup/scripts/copy-prod-to-staging.sh food-butler"
```

## Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Prod | http://butler.home | Production |
| Staging | http://butler-staging.home | Feature testing |
| Dev | http://butler-dev.home | E2E tests |
