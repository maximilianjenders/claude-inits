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

## Code Quality Standards

### Type Safety

Use strong typing to catch errors at development time rather than runtime:

**Python:**
- Use type hints on all function signatures (parameters and return types)
- Use modern syntax from the latest Python version (e.g., `list[str]` not `List[str]`, `str | None` not `Optional[str]`)
- Run type checkers (`mypy`, `pyright`) as part of CI/pre-commit

**TypeScript:**
- Enable `strict` mode in `tsconfig.json`
- Avoid `any` - use `unknown` with type guards when type is truly unknown
- Prefer explicit return types on exported functions

**General:**
- Prefer compile-time/static checks over runtime checks
- Use enums or literal types instead of magic strings
- Define interfaces/types for data structures, especially API boundaries

### Test-First Development

All code must be working and covered by tests before moving to the next step:

- **Unit tests:** Required for all business logic and utility functions
- **Integration tests:** Required when components interact (APIs, databases, external services)
- **Verification:** Tests must pass before proceeding to the next feature or task

### Workflow

1. Write or update tests for the intended behaviour
2. Implement the code to make tests pass
3. Verify all tests pass
4. Only then move to the next step

Do not accumulate untested code. Each logical unit of work should be tested before starting the next.

### Pre-commit Hooks

Projects should use pre-commit hooks to enforce quality standards automatically:

- **Linting:** Run linters before commits are accepted
- **Formatting:** Auto-format code to maintain consistency
- **Type checking:** Catch type errors before they enter the codebase
- **Test execution:** Run relevant tests on staged changes

Configure hooks using tools like `husky`, `pre-commit`, or `lefthook` depending on the project's ecosystem.

## Logging Standards

### Canonical Log Lines

Use structured, contextual logging rather than sparse single-line logs. Each log entry should contain full context for debugging without requiring correlation across multiple entries.

**Avoid:**
```
Calling processOrder()
Order validated
Payment succeeded
```

**Prefer:**
```json
{
  "event": "order_processed",
  "order_id": "abc123",
  "user_id": "u456",
  "status": "success",
  "duration_ms": 245,
  "context": { "items_count": 3, "total": 99.50 }
}
```

### Principles

- **Self-contained:** Each log entry should be useful on its own
- **Structured:** Use JSON or structured formats, not plain text
- **Contextual:** Include request IDs, user IDs, and relevant state
- **One event per operation:** Emit a single rich log at operation completion rather than many sparse logs throughout
