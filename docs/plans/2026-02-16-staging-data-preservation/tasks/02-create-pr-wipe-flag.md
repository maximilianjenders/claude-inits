# Task 2: Add --wipe flag to create-pr skill

## Summary

Add a `--wipe` flag to the `/create-pr` skill that controls whether staging data is synced from prod during deployment.

## Files

- `skills/create-pr/SKILL.md`

## Implementation

### Argument Parsing (top section)

Update usage and argument parsing:

```
/create-pr                    # PR to master, staging data preserved
/create-pr --wipe             # PR to master, wipe staging with prod data
/create-pr --retest           # Redeploy only, staging data preserved
/create-pr --retest --wipe    # Redeploy only, wipe staging with prod data
```

Add `--wipe` to the argument parsing description.

### Deploy to Staging step (step 7 in standard mode, step 7 in retest mode)

After the staging deploy step, add a conditional sync:

```
# Deploy to staging
pi_deploy("[project]", "staging", "$BRANCH")

# If --wipe flag: sync prod data to staging
if [ --wipe ]; then
    pi_copy_prod_to_staging("[project]")
fi
```

Update checklist items for both standard and retest flows:
- Add: `Parse --wipe flag`
- Update staging deploy step: `Deploy to staging + wipe if --wipe flag set`

## Acceptance Criteria

- [ ] `/create-pr` deploys to staging without wiping data
- [ ] `/create-pr --wipe` deploys to staging then syncs prod data
- [ ] `/create-pr --retest` deploys to staging without wiping data
- [ ] `/create-pr --retest --wipe` deploys to staging then syncs prod data
- [ ] Usage section updated with new flag
- [ ] Argument parsing section documents --wipe
- [ ] Checklist items updated
