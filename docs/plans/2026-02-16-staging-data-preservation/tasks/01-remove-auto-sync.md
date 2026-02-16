# Task 1: Remove auto-sync from pi_deploy

## Summary

Remove the automatic `copy-prod-to-staging.sh` call from the `pi_deploy` MCP tool handler.

## Files

- `mcp/pi/server.js` (lines 415-428)

## Implementation

Delete the staging auto-sync block from the `pi_deploy` handler:

```js
// DELETE this entire block (lines 415-428):
// Auto-sync prod data to staging after deploy
if (args.env === "staging") {
  const syncResult = await executeSSH(
    `~/pi-setup/scripts/copy-prod-to-staging.sh ${args.app}`
  );
  return {
    content: [
      {
        type: "text",
        text: formatResult(result) + "\n\n=== Auto-sync prod → staging ===\n" + formatResult(syncResult),
      },
    ],
  };
}
```

After deletion, all environments (including staging) fall through to the generic return on line 430.

## Acceptance Criteria

- [ ] `pi_deploy("spendee", "staging", "branch")` deploys without syncing prod data
- [ ] `pi_deploy("spendee", "prod")` unchanged
- [ ] `pi_deploy("spendee", "dev", "branch")` unchanged
- [ ] `pi_copy_prod_to_staging` still works independently
