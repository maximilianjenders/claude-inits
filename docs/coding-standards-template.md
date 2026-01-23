# Coding Standards

Detailed patterns and conventions for this codebase. For quick reference rules, see [CLAUDE.md](../CLAUDE.md).

> **Template Instructions:** Copy this file to `docs/coding-standards.md` and customize for your project's technology stack. Delete sections that don't apply and add sections for your specific technologies.
>
> **IMPORTANT:** Before filling this out, use the `superpowers:brainstorming` skill to research best practices for each technology in your stack. This ensures you capture industry-standard patterns rather than ad-hoc rules.

## Table of Contents

- [Language / Framework](#language--framework)
- [Database / ORM](#database--orm)
- [Frontend](#frontend)
- [Logging](#logging)
- [Testing](#testing)
- [What's Enforced by Tooling](#whats-enforced-by-tooling)

---

## Language / Framework

> Document patterns for your primary language and framework.

### Enforced by Tooling

These are checked automatically by pre-commit; no manual verification needed:

- [ ] List what your linter/type-checker enforces

### Patterns Used in This Codebase

**Example pattern with code:**

```python
# Good - explain why
example_good_code()

# Bad - explain why
example_bad_code()
```

---

## Database / ORM

> Document database access patterns, query styles, session management.

### Patterns Used in This Codebase

**Example: Query style**

```python
# Good - your preferred style
...

# Bad - style to avoid
...
```

---

## Frontend

> Document frontend patterns, component structure, security considerations.

### Security Considerations

- Template escaping rules
- CSRF protection
- Cookie settings

### Patterns Used in This Codebase

```html
<!-- Good - explain why -->
...

<!-- Bad - explain why -->
...
```

---

## Logging

> Document logging patterns, what context to include, format.

### Configuration

```python
# Your logging setup
```

### Patterns Used in This Codebase

**Good logging example:**

```python
log.info(
    "operation_completed",
    context_field="value",
    duration_ms=123,
)
```

---

## Testing

> Document testing patterns, fixture usage, what to test.

### Patterns

```python
# Example test structure
def test_example() -> None:
    """What this tests."""
    ...
```

---

## What's Enforced by Tooling

### Pre-commit Hooks

These run automatically on every commit:

| Hook | What It Checks |
|------|----------------|
| `linter` | Describe what it checks |
| `type-checker` | Describe what it checks |
| `test-runner` | Describe what it checks |

### Configuration

From `pyproject.toml` / `package.json` / etc.:

```toml
# Your tool configuration
```

### What This Means

**If pre-commit hooks pass, you can trust:**
- List what's guaranteed

**What still requires human judgment:**
- List what tooling can't catch
