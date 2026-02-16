# Staging Data Preservation — Implementation Plan

**Design:** [design.md](design.md)

## Overview

Remove automatic prod-to-staging data sync from `pi_deploy` MCP tool. Move sync decisions to the skill layer where context is available.

## Task Breakdown

| # | Task | Depends On | Files |
|---|------|------------|-------|
| 1 | Remove auto-sync from pi_deploy | — | `mcp/pi/server.js` |
| 2 | Add --wipe flag to create-pr skill | 1 | `skills/create-pr/SKILL.md` |
| 3 | Add pre-deploy wipe prompt to deploy-pi skill | 1 | `skills/deploy-pi/SKILL.md` |
| 4 | Update spendee docker-entrypoint comment | 1 | (spendee-visualiser repo) |

## Dependency Graph

```
#1 Remove auto-sync (ROOT)
├── #2 create-pr --wipe flag
├── #3 deploy-pi wipe prompt
└── #4 Entrypoint comment
```
