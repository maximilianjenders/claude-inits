# Claude Code Skills

Custom skills for Claude Code that work across all my projects.

## Skills Overview

| Skill | Purpose |
|-------|---------|
| `start-session` | Query GitHub for current project state |
| `create-milestone` | Create GitHub milestone from plan |
| `start-milestone` | Execute all issues in a milestone |
| `start-issue` | Begin work on a GitHub issue |
| `update-issue` | Update GitHub issue status |
| `create-pr` | Create a pull request with AI review |
| `merge-pr` | Merge PR and cleanup |
| `deploy-pi` | Deploy to Raspberry Pi environments |
| `run-e2e` | Deploy to dev and run E2E tests |
| `run-tests` | Auto-detect and run test suites |
| `update-docs` | Update project documentation |
| `worktree` | Create git worktrees for parallel work |

## Pi Infrastructure

### Current Workflow

Skills like `deploy-pi` and `run-e2e` use SSH to execute commands on the Pi:

```bash
ssh max@pi.local "cd ~/pi-setup && ./build.sh food-butler dev feature/xyz"
```

**Hostname:** Use `pi.local` (mDNS) - works with or without Tailscale.

### Future: MCP Server (Planned)

A Pi MCP server will provide direct tool access without SSH permission prompts:

| Tool | Description | Auto-allow |
|------|-------------|------------|
| `pi_docker_ps` | List containers | Yes |
| `pi_docker_logs` | View container logs | Yes |
| `pi_docker_restart` | Restart container | Yes |
| `pi_docker_stop` | Stop container | Yes |
| `pi_deploy` | Run build.sh | Yes |
| `pi_read_file` | Read file on Pi | Yes |
| `pi_git_pull` | Pull ~/pi-setup | Yes |
| `pi_reset_dev` | Wipe dev data and reseed | Yes |
| `pi_copy_prod_to_staging` | Copy prod data to staging | Yes |

See `pi-setup/docs/plans/2026-01-30-pi-mcp-server-design.md` for implementation details.

## Project Conventions for E2E Testing

Projects that support E2E testing on the Pi must follow these conventions.

### Docker Entrypoint Pattern

Each project needs a `docker-entrypoint.sh` that seeds fixtures in dev:

```bash
#!/bin/bash
set -e

# Run database migrations
if [ -f "alembic.ini" ]; then
    alembic upgrade head
fi

# Seed fixtures for dev environment
if [ "$ENVIRONMENT" = "dev" ]; then
    echo "Seeding E2E fixtures..."
    python -m app.scripts.seed_fixtures
fi

exec "$@"
```

### Seed Script Requirements

The seed script (`app/scripts/seed_fixtures.py` or similar) should:

1. **Be idempotent** - Check if data exists before inserting
2. **Create deterministic data** - Same fixtures every time
3. **Cover E2E test needs** - All data needed for tests to run

Example structure:
```python
def main():
    # Check if already seeded
    if session.query(Recipe).count() > 0:
        return

    # Create fixture data
    seed_ingredients(session)
    seed_recipes(session)
    session.commit()
```

### Data Persistence

| Environment | Volume | Persistence |
|-------------|--------|-------------|
| prod | `/data/<app>/prod` | Permanent |
| staging | `/data/<app>/staging` | Persistent, can copy from prod |
| dev | `/data/<app>/dev` | Reset on demand |

**Dev data is NOT reset on deploy.** The seed script is idempotent, so existing data is preserved.

### Resetting Dev Data

To fully reset dev to fixtures:

```bash
# Via MCP (future)
pi_reset_dev("food-butler")

# Via SSH (current)
ssh max@pi.local "rm -rf /data/butler/dev/* && docker restart butler-dev"
```

The container restart triggers the entrypoint, which:
1. Runs migrations (creates fresh tables)
2. Runs seed script (populates fixtures)

### E2E Test Guidelines

When tests create/modify data:
- Tests should clean up after themselves when possible
- If debugging flaky tests, reset dev data before retrying
- Data persists between test runs unless explicitly reset

### Project Compliance

| Project | Entrypoint | Dev Seeding | E2E Ready |
|---------|------------|-------------|-----------|
| food-butler | Yes | Yes | Yes |
| spendee-visualiser | Yes | No | No |

To add E2E support to a project:
1. Create `seed_fixtures.py` with test data
2. Add dev seeding block to `docker-entrypoint.sh`
3. Set `ENVIRONMENT=dev` in docker-compose for dev profile
