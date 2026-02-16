# Task 4: Update spendee docker-entrypoint comment

## Summary

Update the comment in spendee-visualiser's `docker-entrypoint.sh` to reflect that staging data sync is no longer automatic.

## Files

- `docker-entrypoint.sh` (in spendee-visualiser repo, line 36-37)

## Implementation

Change:

```bash
# Staging uses prod data copy - handled by pi_deploy MCP tool
# which runs copy-prod-to-staging.sh on the host BEFORE starting the container.
```

To:

```bash
# Staging data persists across deploys. To refresh with prod data,
# run pi_copy_prod_to_staging("spendee") separately.
```

## Note

This change is in the **spendee-visualiser** repo, not claude-inits. It should be committed on the current contracts-v1 branch along with the other PR review fixes.

## Acceptance Criteria

- [ ] Comment updated in docker-entrypoint.sh
- [ ] No code changes (comment only)
