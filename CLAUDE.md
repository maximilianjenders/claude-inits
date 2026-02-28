# Claude Code Standards

## Git

- Branch: `master` (not `main`)
- Commit format: `(type) #issue: Brief summary` with optional bullet body
- Types: feat, fix, docs, chore, refactor, test

Example:
```
(feat) #42: Add user authentication system

- Implement JWT-based auth flow
- Add login and logout endpoints
```

For multi-line commit messages, use multiple `-m` flags: first `-m` for title, second `-m` for body (literal newlines in double quotes are fine). Never use `$(cat <<'EOF'...)` heredocs or `$'...\n...'` ANSI-C quoting — both trigger permission prompts even with `git*` whitelisted.

## Terminology

| Preferred | Avoid |
|-----------|-------|
| blacklist | blocklist |
| whitelist | allowlist |
| master    | main  |

## Milestones

- `Backlog` milestone is a bucket — it NEVER closes
- Feature milestones close when complete
- Promote backlog items to feature milestones when ready

## Project Documentation

| File | Rules |
|------|-------|
| DECISIONS.md | Append-only, never delete, number for cross-ref (D1, D2), include WHY |
| GOTCHAS.md | Reusable fixes only, copy-pasteable, group by Codebase/Environment/Debugging |

Use `/update-docs` at session end.

## Skills & Shared Resources

Skills reference shared templates (issue body template, plan folder structure) via `~/.claude/shared/`. **Never use relative paths like `../shared/`** in skill files — Claude doesn't know the skill's filesystem path when loaded via the Skill tool, so relative paths fail when invoked from downstream projects.

- Shared templates live in `skills/shared/`, symlinked to `~/.claude/shared/`
- Reference as `~/.claude/shared/<filename>` in skill SKILL.md files

## Workflow Rules

- **Test-first:** Write tests before code. Don't accumulate untested code.
- **Quality bias:** Never auto-defer quality issues. Fix now or ask user.
- **Ask, don't work around:** Stop and ask when credentials missing, deps unavailable, or requirements ambiguous.

## When to Run Tests

| Context | Unit | E2E |
|---------|------|-----|
| During implementation | Scoped only | No |
| At commit time | Full (pre-commit) | No |
| At PR creation | Skip | Yes |
| After PR review fixes | Skip | No |
| After staging fixes | Skip | Yes |

## Logging

Follow existing logging patterns in codebase. Use structured key=value format.

## Plugin: Plannotator

The `ExitPlanMode` hook is **disabled** — design doc review uses explicit `plannotator:plannotator-annotate` invocations. Re-disable after plugin updates (see GOTCHAS.md).
