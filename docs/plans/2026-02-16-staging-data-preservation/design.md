# Staging Data Preservation

**Date:** 2026-02-16
**Status:** Approved

## Problem

The `pi_deploy` MCP tool automatically runs `copy-prod-to-staging.sh` after every staging deployment (server.js:415-424). This wipes any test data (contracts, rules, etc.) added during manual staging testing. Each `create-pr --retest` cycle forces the user to re-create all test data.

## Solution

Separate deployment from data sync. The MCP tool handles deployment only; skills orchestrate when to sync data.

### Principle

Unix philosophy: `pi_deploy` deploys, `pi_copy_prod_to_staging` syncs data. Skills compose these tools based on context.

## Changes

### 1. MCP Server (`mcp/pi/server.js`)

Remove the auto-sync block from `pi_deploy`:

```js
// DELETE lines 415-424:
// Auto-sync prod data to staging after deploy
if (args.env === "staging") {
    // ...copy-prod-to-staging.sh...
}
```

`pi_copy_prod_to_staging` stays as-is (already a separate tool).

### 2. `/create-pr` Skill

Add `--wipe` flag for staging data control:

- `--wipe` present: deploy staging + call `pi_copy_prod_to_staging` (fresh prod data)
- No `--wipe`: deploy staging only (data survives)
- `--retest`: never wipes (existing behavior becomes intentional)

### 3. `/deploy-pi` Skill

For staging deployments, ask **before** deploying:

> "Wipe staging data with prod copy?"

- Yes: `pi_copy_prod_to_staging` first, then `pi_deploy`
- No: `pi_deploy` only

### 4. Spendee Docker Entrypoint

Update the comment at line 36-37 of `docker-entrypoint.sh` (in spendee-visualiser repo) to reflect the new behavior. No code changes needed — just the comment.

## What Stays the Same

- `pi_copy_prod_to_staging` MCP tool — available anytime for manual use
- Dev environment — always seeds fixtures
- Prod — no change
- `build.sh` — no change
