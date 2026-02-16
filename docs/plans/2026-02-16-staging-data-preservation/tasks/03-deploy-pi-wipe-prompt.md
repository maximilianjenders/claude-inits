# Task 3: Add pre-deploy wipe prompt to deploy-pi skill

## Summary

When deploying to staging via `/deploy-pi`, ask the user whether to wipe staging data with prod **before** deploying.

## Files

- `skills/deploy-pi/SKILL.md`

## Implementation

### Update the checklist

Change the current staging flow from:

```
### Post-deploy
- [ ] For staging: offer to refresh data with `pi_copy_prod_to_staging`
```

To a **pre-deploy** prompt:

```
### Pre-deploy (staging only)
- [ ] Ask user: "Wipe staging data with fresh prod copy before deploying?"
- [ ] If yes: run `pi_copy_prod_to_staging("[project]")` first
- [ ] Then deploy: `pi_deploy("[project]", "staging", "[branch]")`
```

### Update "Refreshing Staging Data" section

Change the section to explain the new flow:

```markdown
## Staging Data

For staging deployments, you'll be asked whether to wipe data before deploying:

- **Yes**: Runs `pi_copy_prod_to_staging` then deploys (fresh prod data)
- **No**: Deploys only (preserves existing staging data)

To manually refresh staging data at any time:
pi_copy_prod_to_staging("food-butler")
```

### Remove post-deploy offer

Delete the post-deploy line about offering to refresh data.

## Acceptance Criteria

- [ ] `/deploy-pi spendee staging branch` asks about data wipe before deploying
- [ ] Answering "yes" runs copy-prod-to-staging then deploys
- [ ] Answering "no" deploys only
- [ ] Post-deploy refresh offer removed
- [ ] Manual refresh command still documented
