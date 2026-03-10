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

## Skills Editing

**Never edit installed skills outside this repo.** Skills installed from external sources (e.g., `~/.claude/skills/`) may be auto-updated, so local edits get overwritten. Only edit skills that live in `skills/` within this repo.

