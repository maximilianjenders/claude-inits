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

## Project Documentation

Projects should maintain these documentation files:

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `STATUS.md` | Current state, TODOs, open questions, next steps | Every session |
| `DECISIONS.md` | Architectural decisions with rationale | When decisions are made |
| `GOTCHAS.md` | Pitfalls, troubleshooting, lessons learned | When issues are solved |
| `CLAUDE.md` | Coding conventions (this file) | Rarely |
| `docs/coding-standards.md` | Detailed patterns with code examples | When stack changes |

### STATUS.md
- Maximum ~50 lines - keep it concise
- Updated every session with current state
- Completed TODOs are deleted (git has history)
- Resolved questions move to DECISIONS.md

### DECISIONS.md
- Append-only - never delete decisions
- Mark superseded decisions with status
- Number decisions for cross-reference (D1, D2, etc.)
- Always include the WHY, not just WHAT

### GOTCHAS.md
- Only add reusable fixes (not one-time issues)
- Include copy-pasteable solutions
- Group by: Codebase, Environment, Debugging

Use `/update` at session end to maintain these files.

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

## Technology-Specific Rules

Each project should define MUST ALWAYS / SHOULD / MUST NOT rules for its technology stack. These rules capture patterns that tooling can't enforce (business logic, security considerations, architectural choices).

**IMPORTANT:** When adopting a new technology or framework, use the `superpowers:brainstorming` skill to research best practices and define project-specific rules. This ensures each technology gets proper consideration rather than ad-hoc patterns.

### Structure

Create a `docs/coding-standards.md` file for detailed patterns with code examples. Keep CLAUDE.md rules brief and reference the detailed doc:

```markdown
## Project-Specific Rules

**IMPORTANT:** When working on [technologies], read [docs/coding-standards.md](docs/coding-standards.md) for detailed patterns and code examples.

### MUST ALWAYS
- **Rule name** - Brief explanation

### SHOULD
- **Rule name** - Brief explanation

### MUST NOT
- **Rule name** - Brief explanation

### What's Enforced by Tooling
| Tool | Enforces |
|------|----------|
| ... | ... |
```

### Example Rules by Technology

**Python / FastAPI / SQLAlchemy:**
- MUST: Use `Decimal` for money (never `float`)
- MUST: Use SQLAlchemy 2.0 style (`Mapped[]`, `mapped_column()`, `select()`)
- MUST: Validate at boundaries with Pydantic
- SHOULD: Use sync routes with SQLite (no async benefit)
- SHOULD: Use `selectinload`/`joinedload` to prevent N+1 queries
- MUST NOT: Use blocking I/O in `async def` routes

**TypeScript / React:**
- MUST: Use strict mode in tsconfig
- MUST: Define prop types for all components
- SHOULD: Prefer server components where possible (Next.js)
- SHOULD: Co-locate tests with components
- MUST NOT: Use `any` type (use `unknown` with guards)

**htmx / Server-rendered HTML:**
- MUST: Escape all user content in templates
- MUST: Use CSRF tokens for state-changing requests
- SHOULD: Set `hx-disable` on user-generated content areas
- MUST NOT: Call external domains from htmx attributes
- MUST NOT: Use `| safe` filter on user data

**Structured Logging (structlog, pino, etc.):**
- MUST: Include context (request ID, user ID) in every log
- SHOULD: Use JSON format in production, pretty format in dev
- SHOULD: One rich log entry per operation (not many sparse ones)
- MUST NOT: Log sensitive data (passwords, tokens, PII)

### Documenting What Tooling Enforces

Always note which rules are enforced by pre-commit hooks or CI. This prevents duplicating linter work in CLAUDE.md and clarifies what needs human judgment:

```markdown
### What's Enforced by Tooling

| Tool | Enforces |
|------|----------|
| ruff / eslint | Linting, formatting, import sorting |
| mypy --strict / tsc | Type hints, no implicit any |
| pytest / jest | Tests must pass before commit |

If pre-commit hooks pass, the code meets quality standards.
```

Rules in MUST/SHOULD/MUST NOT should focus on things tooling **can't** catch.
