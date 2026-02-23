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

**When related to a GitHub issue, include the issue number after the type:**

```
(type) #123: Brief summary of main accomplishment

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
(feat) #42: Add user authentication system

- Implement JWT-based auth flow
- Add login and logout endpoints
```

```
(fix) #87: Resolve race condition in queue processor

- Add mutex lock around shared state
```

```
(docs): Update API documentation

- Document new endpoints
- Add usage examples
```

## GitHub Milestones

Projects should use these standard milestones:

| Milestone | Purpose | Closes? |
|-----------|---------|---------|
| `Backlog` | Future ideas and small items not yet ready for implementation | Never |
| Feature milestones | Specific features or releases (e.g., "v1.2", "Auth System") | When complete |

### Backlog Milestone

`Backlog` is an **issue bucket** - it collects work but doesn't map to PRs.

**Workflow:**
1. Add issues to Backlog as you notice them (ideas, small fixes, future work)
2. When ready to work, pick 2-4 related issues from Backlog
3. Create a normal branch and PR
4. Merge via normal workflow; issues close automatically
5. Milestone stays open with remaining issues

### Promoting Backlog Items

When a backlog item becomes concrete:
1. Create a proper milestone for the work
2. Move the issue to the new milestone (or close and create detailed issues)
3. Plan and execute via normal workflow

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

## Test Locations

Standard locations for test files across projects:

| Type | Location | Notes |
|------|----------|-------|
| Backend unit | `tests/test_*.py` or `backend/tests/test_*.py` | Pytest |
| Frontend unit | `src/**/*.test.tsx` or `frontend/src/**/*.test.tsx` | Vitest/Jest |
| E2E | `e2e/*.spec.ts` or `frontend/e2e/*.spec.ts` | Playwright |

Use `/run-tests` to auto-detect and run all available test types.

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

### Quality Bias — Fix Now, Don't Auto-Defer

Strive for high quality in all output. When you discover an issue during implementation that affects the quality of the feature being worked on — fix it in the current PR.

**The rule:** Never automatically defer a quality-impacting issue. Either:
1. **Fix it now** as part of the current work, or
2. **Ask the user** whether to fix now or defer

Issues that are clearly out of scope (unrelated features, pre-existing tech debt in untouched code) can be noted for later. But if an issue affects the quality, correctness, or completeness of what you're currently building, the default is to address it immediately. "Not fully in scope" is not a valid reason to silently skip something that degrades the current feature.

### When to Run Tests

| Context | Unit Tests | E2E Tests | Why |
|---------|-----------|-----------|-----|
| During implementation | Scoped (changed files only) | No | Fast feedback loop |
| At commit time | Full suite (pre-commit hook) | No | Catch regressions |
| At PR creation | Skip (pre-commit already ran) | Yes (deploy to dev first) | E2E needs running environment |
| After PR review fixes | Skip (pre-commit runs on fix commit) | No | Avoid redundancy |
| After staging feedback fixes | Skip | Yes (redeploy + retest) | Verify fixes via `/create-pr --retest` |

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

## Plugin Maintenance

### Plannotator

The `plannotator` plugin's default `ExitPlanMode` hook is **disabled** so it doesn't fire on implementation plans. Instead, design doc review uses explicit `plannotator:plannotator-annotate` invocations in skills (see `create-issue` Full Mode Step 2.5).

After plugin updates, re-disable the hook — see `GOTCHAS.md` for details.
