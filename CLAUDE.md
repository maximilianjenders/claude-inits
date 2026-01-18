# Claude Code Standards

## Git Conventions

### Branch Naming

- Use `master` as the default branch name (not `main`)

### Commit Message Format

```
(type): Brief summary of main accomplishment

- [Key change 1]
- [Key change 2]
```

### Commit Types

- `feat` - New feature or capability added
- `fix` - Fixed a bug or broken functionality
- `docs` - Documentation only (diary updates, README changes)
- `chore` - Maintenance, cleanup, or minor updates
- `refactor` - Code restructuring without behavior change
- `test` - Adding or updating tests

### Examples

```
(feat): Add user authentication system

- Implement JWT-based auth flow
- Add login and logout endpoints
```

```
(fix): Resolve race condition in queue processor

- Add mutex lock around shared state
```

```
(docs): Update API documentation

- Document new endpoints
- Add usage examples
```

## Terminology Preferences

Use these terms consistently:

| Preferred | Avoid |
|-----------|-------|
| blacklist | blocklist |
| whitelist | allowlist |
| master (branch) | main |

## Development Diary

Projects should maintain a `DIARY.md` file for:
- Recording decisions and their reasoning (the WHY)
- Tracking session progress
- Noting issues encountered and their resolution status
- Preserving context for future sessions

Use status markers: `RESOLVED`, `OPEN`, `SUPERSEDED`

Never delete history - mark superseded decisions instead.
