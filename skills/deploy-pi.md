---
name: deploy-pi
description: Deploy food-butler or spendee to Pi environments
user_invocable: true
arguments: "[project] [environment] [branch]"
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

1. SSH to Pi (192.168.0.200)
2. Run `./build.sh` with the specified arguments
3. Report success/failure

## Pre-requisites

- SSH key access to Pi configured
- Pi is reachable on the network

## Execution

Run this command via SSH:

```bash
ssh max@192.168.0.200 "cd ~/pi-setup && ./build.sh $ARGS"
```

Where `$ARGS` is the arguments passed to this skill.

## Refreshing Staging Data

After deploying to staging, you may want fresh prod data:

```bash
ssh max@192.168.0.200 "~/pi-setup/scripts/copy-prod-to-staging.sh"
```

## Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Prod | http://butler.home | Production |
| Staging | http://butler-staging.home | Feature testing |
| Dev | http://butler-dev.home | E2E tests |
