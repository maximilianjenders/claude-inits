# Project Template — Technology-Specific Rules

Scaffolding for new projects. Copy relevant sections to your project's CLAUDE.md and customize.

When adopting a new technology or framework, use the `superpowers:brainstorming` skill to research best practices and define project-specific rules.

## Structure

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

## Example Rules by Technology

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

## Documenting What Tooling Enforces

Always note which rules are enforced by pre-commit hooks or CI:

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
