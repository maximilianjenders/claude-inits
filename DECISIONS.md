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

---

## D6: Global Context Settings in ~/.claude/settings.json
**Date:** 2026-10-20
**Status:** Active

**Context:** A food-butler transcript audit (food-butler PR #947) found the skill listing had grown from 5.3k to 6.6k tokens, mostly 15 `anthropic-skills:*` synced from claude.ai and never used in 43 sessions. Colored vitest output cost about 15x its visible text (a 22.8k-char result with 1.5k chars of real text). These settings live outside this repo, so they are recorded here to make them reproducible.

**Decision:** In `~/.claude/settings.json`:
- `"env": { "NO_COLOR": "1" }`: vitest/tinyrainbow honours it even when `FORCE_COLOR` is set. Do not also set `FORCE_COLOR=0`, because Node prints a warning on every process when both are set.
- `"syncClaudeAiSkills": false`: drops the claude.ai-synced skills (about 2.7k tokens per session and per subagent).
- `"skillOverrides"`: `user-invocable-only` for built-ins the model never invoked (schedule, loop, run, keybindings-help, plugin-authoring, fewer-permission-prompts, init, security-review, code-review, find-skills) and `name-only` for dataviz and artifact-*. claude-api stays on because spendee uses the Anthropic SDK. simplify stays on because the create-pr reviewer invokes it.
- `"cleanupPeriodDays": 180`: the default of 30 left only 3 food-butler transcripts for the audit. Roughly 371 MB per 30 days.

**Rationale:** Verified in a fresh `claude -p` session: the skill listing dropped from 22.9k to 6.6k chars, and the Bash tool sees `NO_COLOR=1`. A forced-color vitest run emits ANSI without it and clean output with it.

**Alternatives Considered:**
- Hiding unused superpowers skills via `skillOverrides`: not possible. Claude Code locks plugin skills to `on` (source `plugin`), and user overrides are ignored.
- Editing the superpowers SessionStart hook: rejected, because plugin updates overwrite cache edits (see the plannotator gotcha).
