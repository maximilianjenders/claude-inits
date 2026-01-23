# Decisions

Architectural decisions and their rationale. When wondering "why is it done this way?", check here.

Decisions are numbered for cross-reference (e.g., "see D7").

---

## D1: Test-First Development
**Date:** 2026-01-18
**Status:** Active

**Context:** Need consistent code quality across all projects using this template.

**Decision:** All code must be working and covered by tests before moving to the next step.

**Rationale:**
- Prevents accumulation of untested code
- Ensures each feature works before building on it
- Makes debugging easier by catching issues early

---

## D2: Type Safety Requirements
**Date:** 2026-01-20
**Status:** Active

**Context:** Type errors caught at runtime are expensive; catch them earlier.

**Decision:** Require type hints and strict typing across languages.

**Rationale:**
- Catches errors at development time rather than runtime
- Modern Python syntax (`list[str]`, `str | None`) is cleaner
- TypeScript strict mode prevents common bugs
- Type checkers integrated into CI/pre-commit

**Alternatives Considered:**
- Optional typing - rejected because inconsistent typing creates confusion

---

## D3: Pre-commit Hooks
**Date:** 2026-01-20
**Status:** Active

**Context:** Quality checks should run automatically, not rely on manual process.

**Decision:** Projects should use pre-commit hooks for linting, formatting, type checking, and tests.

**Rationale:**
- Enforces quality standards automatically
- Catches issues early, reducing CI failures
- Maintains consistent code style

---

## D4: Canonical Log Lines
**Date:** 2026-01-20
**Status:** Active

**Context:** Traditional sparse logging makes debugging difficult.

**Decision:** Use structured, contextual logging (canonical log lines) rather than sparse single-line logs.

**Rationale:**
- Each log entry contains full context for debugging
- No need to correlate multiple entries
- Structured JSON enables better querying
- Pattern proven by Stripe and Honeycomb

**Alternatives Considered:**
- Traditional sparse logging - rejected because debugging requires piecing together multiple entries

---

## D5: Documentation Structure
**Date:** 2026-01-23
**Status:** Active

**Context:** Single DIARY.md file becomes verbose and buries important decisions.

**Decision:** Use four focused documentation files instead of one diary.

**Rationale:**
- `STATUS.md`: Quick AI context loading (~50 lines max, updated each session)
- `DECISIONS.md`: Permanent "why" record (this file, append-only)
- `GOTCHAS.md`: Reusable troubleshooting knowledge
- `CLAUDE.md`: Coding conventions (stable reference)

**Alternatives Considered:**
- Single DIARY.md - rejected because decisions get buried in session noise
