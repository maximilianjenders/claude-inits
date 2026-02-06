# Claude Code Skills

Custom skills for Claude Code that work across all my projects.

## Skills Overview

| Skill | Purpose |
|-------|---------|
| `start-session` | Query GitHub for current project state |
| `create-milestone` | Create GitHub milestone from plan |
| `start-milestone` | Execute milestone with phase-based parallel agents |
| `start-issue` | Begin work on a GitHub issue |
| `update-issue` | Update GitHub issue status |
| `create-pr` | Create a pull request with AI review |
| `merge-pr` | Merge PR and cleanup |
| `deploy-pi` | Deploy to Raspberry Pi environments |
| `run-e2e` | Deploy to dev and run E2E tests |
| `run-tests` | Auto-detect and run test suites |
| `update-docs` | Update project documentation |
| `worktree` | Create git worktrees for parallel work |

## MCP Servers

This repo provides two MCP servers for automated GitHub and Pi operations:

### Workflow MCP Server (`mcp/workflow/`)

GitHub operations without permission prompts.

**Setup:**
```bash
claude mcp add workflow node /Users/max/Gits/claude-inits/mcp/workflow/server.js --scope user
```

**Available Tools:**

| Tool | Description |
|------|-------------|
| `git_state` | Detect branch, worktree status, existing worktrees |
| `gh_milestone` | List, find, close, open, rename milestones |
| `gh_milestone_issues` | List issues in a milestone with filters |
| `gh_bulk_issues` | Create, label, unlabel, close, reopen issues (bulk) |
| `gh_update_issue` | Update single issue (title, body, labels, assignees) |
| `gh_issue` | View single issue or list issues with filters |
| `gh_pr_review_issue` | Create issue from PR review findings |
| `gh_create_pr` | Create pull request with full metadata |
| `gh_merge_pr` | Merge PR with various strategies |
| `gh_pr` | View single PR or list PRs with filters |

**Worktree Support:**

All tools accept an optional `cwd` parameter to specify the working directory. This is important when working in git worktrees, as the MCP server runs in a fixed directory and doesn't inherit the Claude session's working directory.

When calling MCP tools from a worktree, pass `cwd` with the worktree path:
```javascript
mcp__workflow__gh_create_pr({
  cwd: "/path/to/worktree",
  title: "...",
  body: "..."
})
```

Without `cwd`, commands like `gh pr create` will use the wrong branch (from the MCP server's directory, not your worktree).

### Pi MCP Server (`mcp/pi/`)

Raspberry Pi container management.

**Setup:**
```bash
claude mcp add pi node /Users/max/Gits/claude-inits/mcp/pi/server.js --scope user
```

See [Pi Infrastructure](#pi-infrastructure) section for available tools.

## CLAUDE.md Template

Copy this section into your project's CLAUDE.md to enable the full workflow:

````markdown
## Session Startup

When starting a new session or when asked "what's next?", use the `/start-session` skill to query GitHub for current project state.

Milestone status prefixes:
- `[SKETCH]` - Rough idea, needs design session
- `[SCOPED]` - Design doc complete, needs implementation plan
- `[READY]` - Issues created with dependencies, ready to build
- `[ACTIVE]` - Work in progress

## Development Workflow

This project uses GitHub Issues/Milestones as the source of truth. Use these skills:

| Task | Skill |
|------|-------|
| Start a session | `/start-session` |
| Create milestone from plan | `/create-milestone` |
| Execute milestone issues | `/start-milestone` |
| Begin work on an issue | `/start-issue` |
| Mark issue progress | `/update-issue` |
| Open PR with review | `/create-pr` |
| Merge PR and cleanup | `/merge-pr` |
| Deploy to Pi for testing | `/deploy-pi` |
| Run tests | `/run-tests` |
| Work on parallel tasks | `/worktree` |

### MCP Tools (Preferred)

When MCP servers are configured, use these tools instead of `gh` CLI:

| Tool | Purpose | Replaces |
|------|---------|----------|
| `mcp__workflow__git_state()` | Branch, worktree status | `git branch`, `git worktree list` |
| `mcp__workflow__gh_milestone(action, ...)` | List/find/close/open/rename milestones | `gh api milestones` |
| `mcp__workflow__gh_milestone_issues(milestone, state, label)` | List issues in milestone | `gh issue list --milestone` |
| `mcp__workflow__gh_issue(action, ...)` | View/list issues with filters | `gh issue view`, `gh issue list` |
| `mcp__workflow__gh_bulk_issues(action, issues, label)` | Bulk label/close/create | `gh issue edit`, `gh issue create` |
| `mcp__workflow__gh_update_issue(issue, ...)` | Update single issue | `gh issue edit` |
| `mcp__workflow__gh_create_pr(title, body, ...)` | Create PR | `gh pr create` |
| `mcp__workflow__gh_merge_pr(pr, method, ...)` | Merge PR | `gh pr merge` |
| `mcp__workflow__gh_pr(action, ...)` | View/list PRs with filters | `gh pr view`, `gh pr list` |

**Fallback:** If MCP tools are unavailable, skills include `gh` CLI commands as fallback.

### Issue Labels

| Label | Meaning | Issue State |
|-------|---------|-------------|
| `in-progress` | Currently being worked on | Open |
| `ready-for-review` | Implementation done, awaiting review | Open |
| `code-complete` | Done on feature branch, awaiting merge | **Closed** |
| `blocked-failed` | Subagent failed after retry, skipped | Open |
| `pr-review` | Issue created from PR code review findings | Open/Closed |

**Label flow:**
```
Agent phase:
  (none) → in-progress → ready-for-review
           [working]     [done, not committed]

Orchestrator phase (after review):
  ready-for-review → code-complete (closed)
  [commit]           [committed]
```

**Who sets labels:**
- `in-progress` / `ready-for-review` - Set by agents during implementation
- `code-complete` - Set by orchestrator after committing

The `pr-review` label marks issues created during `/create-pr` code review. These follow the same flow but are distinguished from original milestone scope.

Issues are closed when marked `code-complete` so GitHub's milestone progress bar shows actual progress. The `code-complete` label distinguishes "committed on branch" from "merged to master" (no label).

### Planning Workflow

When creating implementation plans:

1. `brainstorming` → Design doc (`docs/plans/YYYY-MM-DD-<name>-design.md`) → **Update milestone to `[SCOPED]`**
2. `writing-implementation-tasks` or `writing-plans` → Implementation plan (`docs/plans/YYYY-MM-DD-<name>-impl.md`)
3. `/create-milestone` → Create GitHub issues from plan tasks and update milestone description with plan link → **Update milestone to `[READY]`**

Run `/create-milestone` immediately after writing the plan — don't defer issue creation.

### Plan Execution (overrides writing-plans/writing-implementation-tasks options)

When the planning skill offers execution options after creating GitHub issues, **ignore those options** and offer:

**"Plan complete with GitHub issues. Ready to execute with `/start-milestone`. Options:**

1. **This session** - I'll run `/start-milestone <number>` now
2. **New session** - Open a new Claude session and paste: `/start-milestone <number>`

**Which approach?"**

Include the actual milestone number so the user can copy-paste directly. Both options use `/start-milestone` for parallel subagent execution with crash recovery and automatic label management.
````

## Pi Infrastructure

### Pi MCP Server

The Pi MCP server provides direct tool access without SSH permission prompts. Skills like `deploy-pi` and `run-e2e` use these tools automatically.

**Setup:** Add to global Claude config (one-time):
```bash
claude mcp add pi /Users/max/Gits/pi-setup/mcp/start.sh --scope user
```

**Available Tools:**

| Tool | Description |
|------|-------------|
| `pi_docker_ps` | List containers |
| `pi_docker_logs` | View container logs |
| `pi_docker_restart` | Restart container |
| `pi_docker_stop` | Stop container |
| `pi_docker_inspect` | Get container/image metadata (creation time, config, image) |
| `pi_docker_exec` | Run read-only command in running container |
| `pi_docker_run` | Run read-only command in temporary container from image |
| `pi_deploy` | Run build.sh |
| `pi_read_file` | Read file on Pi |
| `pi_git_pull` | Pull ~/pi-setup |
| `pi_reset_dev` | Wipe dev data and reseed |
| `pi_copy_prod_to_staging` | Copy prod data to staging |

**Debug Commands:** `pi_docker_exec` and `pi_docker_run` are restricted to read-only commands: `cat`, `ls`, `head`, `tail`, `find`, `grep`, `env`, `ps`, `stat`.

**Hostname:** Uses `pi.local` (mDNS) - works with or without Tailscale.

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
