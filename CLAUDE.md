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

## Skills & Shared Resources

Skills reference shared templates (issue body template, plan folder structure) via `~/.claude/shared/`. **Never use relative paths like `../shared/`** in skill files — Claude doesn't know the skill's filesystem path when loaded via the Skill tool, so relative paths fail when invoked from downstream projects.

- Shared templates live in `skills/shared/`, symlinked to `~/.claude/shared/`
- Reference as `~/.claude/shared/<filename>` in skill SKILL.md files

## Form Error Handling

**No silent data loss in forms.** Never let a form submit successfully while silently discarding user-entered values. If input can't be parsed, validated, or fetched, show an inline error and keep the form open. Prefer `type="text" inputMode="decimal"` over `type="number"` for decimal inputs to avoid locale-dependent parsing bugs (e.g., German locale uses comma as decimal separator, causing dot-separated values to be silently dropped). Silent `catch` blocks that swallow errors without user feedback are a code smell — always surface failures visibly.

## Brainstorming Workflow Override

After `superpowers:brainstorming` produces a design doc, **always** invoke `plannotator:plannotator-annotate` on it. Address annotation feedback before continuing, then proceed to `writing-implementation-tasks` (which calls `writing-plans` internally).

The `ExitPlanMode` hook in plannotator is **disabled** (see GOTCHAS.md) — the explicit invocation above replaces it.
