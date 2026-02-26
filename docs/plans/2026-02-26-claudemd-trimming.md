# CLAUDE.md Trimming — Hazard-Tracker Redesign

Based on ETH Zurich's 2026 study findings: agents perform worse with long context files full of discoverable information. Best CLAUDE.md files are short "landmine trackers" — non-obvious hazards only.

**Scope:** claude-inits, food-butler (root + backend + frontend), spendee-visualiser

**Principle:** "Can the agent discover this independently? Delete it."

---

## claude-inits/CLAUDE.md (336 → ~120 lines)

This is the "template" — downstream projects copy from it. Trimming here sets the standard.

### DELETE (discoverable or generic knowledge)

- **Git commit format examples** (lines 38-56) — Two examples are enough, three is redundant. Keep the format spec + one example.
- **Test locations table** (lines 126-136) — Agents find `tests/` dirs and `*.test.tsx` on their own.
- **Type safety section** (lines 140-158) — Generic advice ("use type hints", "enable strict mode", "avoid any"). Tooling enforces this anyway.
- **Pre-commit hooks section** (lines 208-217) — Generic. Every project's hooks enforce themselves.
- **Logging standards** (lines 219-250) — Generic structured logging advice. Not a landmine. Agents follow existing code patterns. Add a one-liner reminder instead: "Follow existing logging patterns; use structured key=value format."
- **Technology-specific rules section** (lines 251-327) — Entire section is example templates for downstream projects. Not actual rules for claude-inits itself. Move to `docs/project-template.md` as scaffolding for new projects (not loaded every session).
- **Test-first workflow steps** (lines 159-174) — Rephrase to a one-liner. The skill enforces this.

### KEEP (landmines, non-discoverable)

- **Git commit format spec** (lines 9-35) — Non-standard format with `(type)` parens. Keep but trim to format + one example.
- **Branch naming: master** (lines 5-7) — Non-discoverable preference.
- **Backlog milestone semantics** (lines 58-83) — "Never closes" is a landmine. Keep but condense.
- **Terminology preferences** (lines 85-93) — Strong preference, agent would default to opposite.
- **Project documentation file rules** (lines 95-123) — STATUS.md ephemeral, DECISIONS.md append-only — these are constraints agents wouldn't infer.
- **Quality bias** (lines 176-184) — Behavioral rule agents default against. Keep.
- **Ask, don't work around** (lines 186-196) — Same.
- **When to run tests table** (lines 198-206) — Non-obvious scoping rules.
- **Plannotator hook disabled** (lines 329-335) — Genuine trap.

### RESTRUCTURED RESULT

```
# Claude Code Standards

## Git
- Branch: `master` (not `main`)
- Commit format: `(type) #issue: Brief summary` with optional bullet body
- Types: feat, fix, docs, chore, refactor, test

## Terminology
| Preferred | Avoid |
|-----------|-------|
| blacklist | blocklist |
| whitelist | allowlist |
| master    | main  |

## Milestones
- `Backlog` milestone is a bucket — it NEVER closes
- Feature milestones close when complete
- Promote backlog items to feature milestones when ready

## Project Documentation
| File | Rules |
|------|-------|
| STATUS.md | Max ~50 lines, delete completed TODOs, move resolved Qs to DECISIONS.md |
| DECISIONS.md | Append-only, never delete, number for cross-ref (D1, D2), include WHY |
| GOTCHAS.md | Reusable fixes only, copy-pasteable, group by Codebase/Environment/Debugging |

Use `/update-docs` at session end.

## Workflow Rules
- **Test-first:** Write tests before code. Don't accumulate untested code.
- **Quality bias:** Never auto-defer quality issues. Fix now or ask user.
- **Ask, don't work around:** Stop and ask when credentials missing, deps unavailable, or requirements ambiguous.

## When to Run Tests
| Context | Unit | E2E |
|---------|------|-----|
| During implementation | Scoped only | No |
| At commit time | Full (pre-commit) | No |
| At PR creation | Skip | Yes |
| After PR review fixes | Skip | No |
| After staging fixes | Skip | Yes |

## Logging
Follow existing logging patterns in codebase. Use structured key=value format.

## Plugin: Plannotator
The `ExitPlanMode` hook is **disabled** — design doc review uses explicit `plannotator:plannotator-annotate` invocations. Re-disable after plugin updates (see GOTCHAS.md).
```

---

## food-butler/CLAUDE.md (359 → ~120 lines)

### DELETE

- **Directory structure** (lines 49-88) — Agent reads filesystem. Move to README.md for human reference.
- **Test locations table** (lines 90-100) — Discoverable.
- **Development commands with examples** (lines 104-128) — Mostly discoverable from pyproject.toml / package.json. The `-C backend` gotcha is kept as a landmine. Keep install commands in a "Worktree Setup" section (worktree deps/test issues are a recurring problem).
- **Project-specific MUST/SHOULD/MUST NOT** (lines 147-168) — Redundant with backend/frontend CLAUDE.md files which already cover these.
- **Test-first development steps** (lines 170-179) — One-liner.
- **Quality bias full text** (lines 181-189) — Condense to one-liner.
- **Ask don't work around full text** (lines 191-201) — Condense to one-liner.
- **When to run tests table** (lines 203-211) — Duplicate of claude-inits.
- **Regression/E2E test details** (lines 213-234) — Move to frontend/CLAUDE.md (E2E) and keep regression as one-liner.
- **Git conventions** (lines 236-268) — Duplicate of claude-inits.
- **Development workflow skill table** (lines 272-286) — Skills are discoverable.
- **Backlog section** (lines 287-296) — Duplicate of claude-inits.
- **Label flow** (lines 298-313) — Skills manage this automatically.
- **Planning workflow** (lines 314-336) — Skills handle this.

### KEEP (landmines)

- **Subagent "read CLAUDE.md" instruction** (lines 19-36) — Agents miss this consistently.
- **Working dir is root with `-C`/`--prefix` flags** (lines 26-28) — Direct gotcha.
- **Worktree path double-nesting** (lines 130-145) — Non-obvious bug.
- **Milestone status prefixes** (lines 43-48) — Non-discoverable convention.
- **Pi environments table** (lines 339-346) — URLs, ports — non-discoverable.
- **Container naming** (lines 348-358) — Required for MCP tools to work.
- **No external URLs in E2E** (lines 231-234) — Keep as one-liner, detailed pattern in frontend/CLAUDE.md.
- **E2E deploy ordering** — Deploy before reset. Keep as one-liner.

### RESTRUCTURED RESULT

```
# Food Butler

Meal planning app with baby food tracking. FastAPI backend, React frontend.

Detailed coding standards: [`backend/CLAUDE.md`](backend/CLAUDE.md) | [`frontend/CLAUDE.md`](frontend/CLAUDE.md)

## Subagent Instructions

Always include in subagent prompts: **"Read CLAUDE.md first."**

Subagents commonly miss:
- Working dir is project root — use `poetry -C backend run pytest`, `npm --prefix frontend test`
- Use `Decimal` for money, SQLAlchemy 2.0, test-first, `master` branch, `(type) #issue: desc`

## Working Directory Gotcha

CWD is project root. Use `-C backend` / `--prefix frontend` flags. See Worktree Setup for path-related traps.

## Worktree Setup

First time in a worktree, install dependencies:
```bash
cd backend && poetry install && cd ..
npm --prefix frontend install
```

**Worktree trap:** `-C backend` works for no-path commands, but pytest path args get double-nested:
```bash
poetry -C backend run pytest backend/tests/test_foo.py  # WRONG: resolves to backend/backend/tests/...
cd backend && poetry run pytest tests/test_foo.py        # CORRECT
```

## Session Startup

Use `/start-session`. Milestone status prefixes: `[SKETCH]`, `[SCOPED]`, `[READY]`, `[ACTIVE]`

## E2E Hazards

- **Deploy before reset:** `pi_deploy` then `pi_reset_dev`, never the reverse (reset seeds with old code)
- **No external URLs:** Use local fixtures via `http://localhost:8001/api/test/recipes/{name}`

## Pi Environments

| Env | URL | Port | Container |
|-----|-----|------|-----------|
| Prod | butler.home | 8000 | butler-prod |
| Staging | butler-staging.home | 8001 | butler-staging |
| Dev | butler-dev.home | 8002 | butler-dev |

Container names required for Pi MCP tools. App env vars: `deploy/env.template`. Deployment config: pi-setup repo.

## Workflow Rules
- **Test-first.** Quality bias — fix now or ask. Ask, don't work around.
```

---

## food-butler/backend/CLAUDE.md (700 → ~180 lines)

### DELETE

- **Route structure example** (lines 9-31) — Standard FastAPI, discoverable from codebase.
- **Pagination example** (lines 33-73) — Standard pattern, exists in code already. But keep as a one-liner rule: "List endpoints returning many items MUST use `PaginatedResponse`." (prevents new endpoints from skipping it)
- **Error handling patterns** (lines 75-95) — Standard HTTP error conventions.
- **HTTP methods table** (lines 97-105) — REST basics.
- **Response formats** (lines 107-117) — Standard Pydantic usage.
- **Model definitions example** (lines 122-154) — Agent reads existing models.
- **Query style examples** (lines 156-182) — Agent sees existing queries.
- **Eager loading examples** (lines 184-202) — Standard SQLAlchemy, discoverable.
- **Relationships examples** (lines 204-219) — Standard.
- **Association tables example** (lines 221-240) — Standard.
- **Pydantic schema patterns** (lines 242-324) — Naming conventions and ConfigDict are discoverable from existing schemas.
- **Testing patterns** (lines 326-464) — Full fixture and test examples. Agent reads existing tests. The only non-obvious parts are already covered by root CLAUDE.md (test-first mandate).
- **Commands section** (lines 466-499) — Duplicate of root CLAUDE.md.
- **Migration rollback** (lines 546-554) — Standard alembic, discoverable.
- **Logging conventions** (lines 656-700) — Standard logging, discoverable from existing code.

### KEEP (landmines)

- **FTS5 reindex** (lines 501-511) — Critical gotcha, no way to discover this.
- **SQLite batch_alter_table** (lines 513-526) — Causes migration failures without explanation.
- **Enum stores NAME not value** (lines 528-544) — Causes silent data corruption then LookupError.
- **Recipe versioning backward-linked** (lines 556-571) — Non-obvious data model design.
- **Ingredient name normalization** (lines 573-583) — Auto title-case, affects test data.
- **Ingredient aliases** (lines 585-592) — Direct name queries miss aliased ingredients.
- **LLM batching mandatory** (lines 594-629) — Rate limit hazard, non-obvious.
- **Quantity parsing** (lines 631-644) — `Decimal()` crashes on LLM fractions.
- **Logging level derived from ENVIRONMENT** (lines 655-665) — Override with LOG_LEVEL.

### RESTRUCTURED RESULT

```
# Backend Hazards

FastAPI + SQLAlchemy + SQLite. Existing code demonstrates all standard patterns.

## API Rules
- List endpoints returning many items MUST use `PaginatedResponse` (see existing endpoints for pattern)

## Database

### FTS5 Reindex
After direct DB modifications (not via API), rebuild search index:
```sql
INSERT INTO recipes_fts(recipes_fts) VALUES('rebuild');
```
API endpoints handle this automatically.

### SQLite Migrations — batch mode required
SQLite can't `ALTER TABLE ... ADD CONSTRAINT`. Always use `batch_alter_table`:
```python
# WRONG — fails on SQLite
op.create_unique_constraint("uq_name", "table", ["col"])

# RIGHT
with op.batch_alter_table("table") as batch_op:
    batch_op.create_unique_constraint("uq_name", ["col"])
```

### Enum Storage — uses NAME, not value
`sqlalchemy.Enum()` stores `ATE_WELL` (name), not `ate_well` (value). Raw strings cause `LookupError` on read. Always use enum members:
```python
FoodExposure(acceptance=Acceptance.ATE_WELL)    # GOOD
FoodExposure(acceptance="ate_well")              # BAD — silent corruption
```
Applies to `seed_e2e_fixtures.py` and `seed.py` too.

### Recipe Versioning
Backward-linked list: `previous_version_id` points v3→v2→v1. Only one `is_current=True` per lineage.

### Ingredient Names
Auto title-cased on create/update/import. Use title case in seeds/tests: `"Blood Oranges"` not `"blood oranges"`.

### Ingredient Aliases
626 canonical ingredients with regional aliases (e.g., "coriander"→"cilantro"). Direct name queries may miss aliased ingredients — use alias lookup service.

## LLM Services

### Batching is mandatory
Each LLM method call = 1 API request. Gemini free tier: 20 req/day. NEVER call in loops:
```python
# WRONG
for ing in ingredients:
    llm.suggest_shopping_category(ing.name)

# RIGHT
llm.suggest_shopping_categories_batch([ing.name for ing in ingredients])
```
When adding LLM features: check `protocols.py` for batch method, create one if missing.

### Quantity Parsing
LLMs return fractions ("1/2"). `Decimal()` can't parse these. Use `parse_quantity()`:
```python
from app.services.units import parse_quantity
qty = parse_quantity(str(llm_response["quantity"]))  # handles fractions
```

## Logging
Level from ENVIRONMENT: prod=INFO, staging/dev=DEBUG. Override with `LOG_LEVEL` env var.
```

---

## food-butler/frontend/CLAUDE.md (292 → ~100 lines)

### DELETE

- **Component structure example** (lines 7-31) — Standard React, discoverable.
- **Data fetching pattern** (lines 33-56) — Standard, exists in codebase.
- **Data fetching rules** (lines 58-64) — Generic good practices.
- **TypeScript conventions** (lines 72-99) — Standard, enforced by tsconfig.
- **Styling tailwind patterns** (lines 103-114) — Discoverable from existing components.
- **Testing patterns** (lines 142-218) — Standard vitest/RTL patterns, discoverable from existing tests.
- **Commands** (lines 282-291) — Discoverable.

### KEEP (landmines)

- **NavFooter mandatory** (lines 118-127) — No linter enforces this. Agent will forget.
- **Design tokens** (lines 129-138) — Non-obvious custom colors/fonts.
- **Vite build-time env var guard** (lines 262-278) — `command === "build"` guard is critical.
- **Dead code elimination gotcha** (lines 280) — Env var gating eliminates component body.
- **E2E no external URLs** (lines 237-244) — With the fixture pattern.
- **E2E test ordering** (lines 246-251) — Mutating tests last, shared live DB.
- **E2E deploy ordering** (lines 253-259) — Deploy before reset.
- **Backend internal port for E2E** (line 243) — `localhost:8001` not public port.

### RESTRUCTURED RESULT

```
# Frontend Hazards

React + TypeScript + Tailwind. Existing components demonstrate all standard patterns.

## NavFooter — MANDATORY
Every top-level page MUST include `<NavFooter />`. No linter enforces this.
```tsx
<NavFooter current="recipes" />
```
Props: `recipes`, `calendar`, `shopping`, `pantry`, `ingredients`, `baby`, `settings`. For non-nav pages, use closest parent section.

## Design Tokens
Colors (tailwind.config.js): `sage` (#7CAA8E), `peach` (#E8B298), `cream` (#FAF9F7)
Fonts: `font-display` (Fraunces headings), default (DM Sans body)

## Vite Build-Time Env Vars
The `command === "build"` guard in vite.config.ts is **critical**:
```typescript
export default defineConfig(({ command }) => ({
  ...(command === "build" && {
    define: { "import.meta.env.VITE_ENVIRONMENT": JSON.stringify(process.env.VITE_ENVIRONMENT || "") },
  }),
}));
```
Without it, `define` replaces env vars during vitest too, breaking tests.

**Dead code trap:** Components returning `null` on empty env vars get eliminated by Vite's minifier, making output identical to prod → Docker caches the layer.

## E2E Hazards
- **No external URLs.** Use `http://localhost:8001/api/test/recipes/{name}` (backend internal port, not public port). HTML fixtures in `backend/app/data/test_recipes/*.html`.
- **Test ordering matters.** Shared live DB — mutating tests (confirm, delete) must run LAST in describe blocks.
- **Deploy before reset.** `pi_deploy` then `pi_reset_dev`. Reverse seeds with old code.
```

---

## spendee-visualiser/CLAUDE.md (471 → ~140 lines)

### DELETE

- **Directory structure** (lines 9-83) — Agent reads filesystem. Move to README.md for human reference.
- **Test locations table** (lines 84-92) — Discoverable.
- **Development commands** (lines 96-116) — Discoverable from pyproject.toml. The `uv run` mandate is kept as a landmine. Worktree setup already covered.
- **Architecture documentation** (lines 132-140) — Keep ERD regeneration as one-liner.
- **Development workflow skill table** (lines 160-174) — Skills are discoverable.
- **Backlog section** (lines 176-183) — Duplicate of claude-inits standard.
- **Label flow details** (lines 185-206) — Skills manage this.
- **Milestone status prefixes** (lines 208-217) — Keep as one-liner.
- **Planning workflow** (lines 218-226) — Skills handle this.
- **Session startup** (lines 228-230) — One-liner.
- **Git conventions** (lines 311-374) — Duplicate of claude-inits.
- **Terminology** (lines 376-384) — Duplicate.
- **Type safety section** (lines 386-406) — Generic, enforced by mypy --strict.
- **Quality bias full text** (lines 407-415) — Condense.
- **Ask don't work around full text** (lines 417-427) — Condense.
- **Pre-commit hooks section** (lines 429-438) — Generic.
- **Logging standards** (lines 440-471) — Generic, established in codebase already.
- **What's enforced by tooling table** (lines 282-292) — Self-evident from pre-commit config.

### KEEP (landmines)

- **`uv run` mandatory** (lines 96-98, 296-307) — NEVER use `.venv/bin/` paths. Critical gotcha.
- **Venv recreation fix** (lines 294-299) — Copy-pasteable solution.
- **Worktree venv setup** (lines 118-130) — First-time setup in worktrees.
- **ERD regeneration** (lines 132-140) — Easy to forget.
- **Subagent instructions** (lines 142-157) — "Read CLAUDE.md first" mandate.
- **12-month calculation patterns** (line 260) — The averaging gotcha (#150).
- **L12M zero-month trap** (line 280) — Don't filter non-zero months.
- **Pi container names** (lines 232-244) — Required for MCP tools.
- **Project overview** (lines 3-6) — What the project is.
- **MUST/SHOULD/MUST NOT rules** (lines 252-281) — Trim to only non-tooling-enforced items.

### RESTRUCTURED RESULT

```
# Spendee Visualiser

Data ingestion pipeline and visualisation for Spendee financial data. Python/FastAPI backend, htmx frontend, SQLite.

Detailed coding patterns: [docs/coding-standards.md](docs/coding-standards.md)

## Critical: Always use `uv run`
NEVER use `.venv/bin/` paths or absolute paths. Always `uv run <cmd>`.
```bash
uv run pytest                    # RIGHT
.venv/bin/pytest                 # WRONG — breaks on venv recreation
/Users/max/.../bin/pytest        # WRONG
```

**"bad interpreter" / "No module named" fix:**
```bash
uv venv && uv sync --all-extras && uv run pre-commit install --install-hooks
```

## Worktrees
First time in a new worktree, initialize venv and hooks:
```bash
uv venv && uv sync --all-extras && uv run pre-commit install --install-hooks
```
After setup, all commands work normally: `uv run pytest`, `uv run ruff check .`, `uv run mypy --strict src/`, etc. No special flags needed (unlike food-butler's `-C` workaround).

## Subagent Instructions
Always include: **"Read CLAUDE.md first."**

Subagents commonly miss: `uv run` (not `.venv/bin/`), `Decimal` for money, SQLAlchemy 2.0, test-first, `master` branch, `(type) #issue: desc`

## 12-Month Calculation Hazards
- Analytics comparisons **exclude** reference month; yearly budget totals **include** it
- **L12M averages MUST divide by full window size (e.g., 12)**, never by non-zero month count
- Filtering to non-zero months inflates averages for sporadic categories (#150)

See [docs/coding-standards.md](docs/coding-standards.md#analytics--12-month-calculations) for patterns.

## ERD Regeneration
When `models.py` changes: `uv run python scripts/generate_erd.py` → copy output to `docs/architecture.md`

## MUST Rules (not caught by tooling)
- `Decimal` for money — never `float`
- Escape all user content — never `| safe` on user data
- Follow 12-month calculation patterns (see above)
- Regression tests for user-reported bugs
- Type labels required on issues: `feature`, `bug`, `tooling`, `user-feedback`

## Pi Deployment

| Env | Container |
|-----|-----------|
| Prod | spendee-prod |
| Staging | spendee-staging |
| Dev | spendee-dev |

Container names required for Pi MCP tools.

## Session / Milestones
Use `/start-session`. Prefixes: `[SKETCH]`, `[SCOPED]`, `[READY]`, `[ACTIVE]`

## Workflow Rules
- **Test-first.** Quality bias — fix now or ask. Ask, don't work around.
```

---

## Summary of Changes

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| claude-inits/CLAUDE.md | 336 | ~120 | 64% |
| food-butler/CLAUDE.md | 359 | ~120 | 67% |
| food-butler/backend/CLAUDE.md | 700 | ~180 | 74% |
| food-butler/frontend/CLAUDE.md | 292 | ~100 | 66% |
| spendee-visualiser/CLAUDE.md | 471 | ~140 | 70% |
| **Total** | **2,158** | **~660** | **69%** |

### What was removed
- Standard patterns discoverable from existing code (SQLAlchemy, Pydantic, React, testing)
- Duplicate sections across files (git conventions, quality standards, logging)
- Generic advice that tooling already enforces (type safety, pre-commit)
- Tutorial-style code examples for standard library usage

### What was kept
- Non-obvious gotchas/landmines (FTS5, enum names, batch mode, env var guards)
- Behavioral rules agents default against (quality bias, ask don't work around)
- Infrastructure specifics (Pi URLs, container names, deploy ordering)
- Project-specific conventions agents can't infer (design tokens, NavFooter, 12-month math)

### Additional tasks from feedback
- Move directory structures from CLAUDE.md to README.md (food-butler, spendee-visualiser)
- Move technology-specific rules templates from claude-inits/CLAUDE.md to `docs/project-template.md`
- Fix `/update` → `/update-docs` in current claude-inits/CLAUDE.md (existing bug)
