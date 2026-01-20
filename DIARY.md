# Development Diary

This diary records decisions, progress, and context for the claude-inits template repository.

---

## 2026-01-18: Add Code Quality Standards

### Session Summary

Added test-first development requirements to the CLAUDE.md template to ensure all projects follow consistent code quality practices.

### Decisions Made

#### 1. Test-First Development Requirement

**Decision:** All code must be working and covered by tests before moving to the next step

**Why:**
- Prevents accumulation of untested code
- Ensures each feature works before building on it
- Makes debugging easier by catching issues early
- Applies to all projects using this template

### Files Changed

- `CLAUDE.md` - Added Code Quality Standards section with test-first workflow

---

## 2026-01-20: Expand Code Quality Standards

### Session Summary

Added three new sections to CLAUDE.md covering type safety, pre-commit hooks, and canonical log lines. These standards ensure consistent, high-quality code across all projects using this template.

### Decisions Made

#### 1. Type Safety Requirements

**Decision:** Require type hints and strict typing across languages

**Why:**
- Catches errors at development time rather than runtime
- Modern Python syntax (`list[str]`, `str | None`) is cleaner and avoids imports from `typing`
- TypeScript strict mode prevents common type-related bugs
- Type checkers should be integrated into CI/pre-commit

**Alternatives Considered:**
- Optional typing - rejected because inconsistent typing creates confusion and misses errors

#### 2. Pre-commit Hooks Standard

**Decision:** Projects should use pre-commit hooks for linting, formatting, type checking, and tests

**Why:**
- Enforces quality standards automatically before code enters the repo
- Catches issues early, reducing CI failures
- Maintains consistent code style without manual review overhead

#### 3. Canonical Log Lines Standard

**Decision:** Use structured, contextual logging (canonical log lines) rather than sparse single-line logs

**Why:**
- Each log entry contains full context for debugging
- No need to correlate multiple log entries to understand what happened
- Structured JSON format enables better querying and analysis
- Pattern popularized by Stripe and Honeycomb for production debugging

**Alternatives Considered:**
- Traditional sparse logging - rejected because debugging requires piecing together multiple entries

### Files Changed

- `CLAUDE.md` - Added Type Safety, Pre-commit Hooks, and Logging Standards sections

---

*Next: Template ready for use in new projects*
