# Pi DB Query Tool — Design Spec

**Issue:** #24
**Date:** 2026-03-12

## Summary

Add a `pi_db_query` MCP tool to the Pi server for running read-only SQL queries against container SQLite databases. Enables debugging and auditing tasks (e.g., checking for duplicate ingredients, verifying data integrity) from Claude Code sessions.

## Threat Model

The only caller is a Claude Code agent on the user's laptop, SSH-ing into the Pi. The goal is preventing accidental damage (e.g., agent issues a DELETE), not defending against adversarial input.

## Tool Interface

```
pi_db_query(app, env, query, limit?, offset?)
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `app` | string | yes | — | Application name (`food-butler` or `spendee`) |
| `env` | string | yes | — | Environment (`prod`, `staging`, or `dev`) |
| `query` | string | yes | — | SQL query string |
| `limit` | number | no | 500 | Max rows returned. Appended as `LIMIT` if query has none. |
| `offset` | number | no | 0 | Row offset for pagination. Appended as `OFFSET` when > 0. |

### Tool Description (shown to agents)

```
Run a read-only SQL query against an app's SQLite database.
Available databases: food-butler (/app/data/food_butler.db), spendee (/app/data/spendee.db).
Environments: prod (live data), staging (prod copy for testing), dev (seeded test fixtures).
Supports SELECT, PRAGMA, EXPLAIN, WITH. Results are pipe-delimited with headers.
Default limit: 500 rows. Use limit/offset for pagination.
```

## APP_CONFIG Changes

Add `dbPath` to each app entry:

```js
"food-butler": {
  containerPrefix: "butler",
  seedCommand: "python -m app.scripts.seed_e2e_fixtures",
  dbPath: "/app/data/food_butler.db",
},
"spendee": {
  containerPrefix: "spendee",
  seedCommand: "python -m spendee_visualiser.scripts.seed_e2e_fixtures",
  dbPath: "/app/data/spendee.db",
},
```

## Query Validation (`validateQuery`)

New function, **separate from `sanitizeInput()`** — SQL legitimately uses parentheses and other characters that `sanitizeInput()` blocks.

Steps:
1. Trim whitespace
2. Reject if starts with `.` (blocks dot-commands like `.shell`, `.read`)
3. Strip SQL comments (`--` line comments, `/* */` block comments)
4. Normalize to uppercase for keyword matching
5. Check first keyword is one of: `SELECT`, `PRAGMA`, `EXPLAIN`, `WITH`
6. Block write keywords anywhere in normalized query: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `REPLACE`, `ATTACH`, `DETACH`

## Pagination

- If the query does not contain `LIMIT`, append `LIMIT <limit>` (default 500)
- If `offset > 0`, append `OFFSET <offset>`
- If the query already has an explicit `LIMIT`, respect it (do not override)

## Execution

Container name derived from `APP_CONFIG[app].containerPrefix` + `-` + `env`.
DB path from `APP_CONFIG[app].dbPath`.

```bash
docker exec <container> sqlite3 -readonly -header -separator '|' <dbPath> "<query>"
```

Run via `executeSSH()` like all other tools.

## Safety Layers (in order)

1. **`validateQuery()`** — fast-fail on non-read statements and dot-commands
2. **`sqlite3 -readonly`** — engine-level write prevention (refuses writes even if validation is bypassed)
3. **Implicit `LIMIT 500`** — prevents accidental context-window flooding

`sanitizeInput()` is intentionally **not** applied to the query parameter. It is still applied to `app` and `env` via `validateApp()`/`validateEnv()`.

## Tests

| Case | Expected |
|------|----------|
| `SELECT * FROM ingredients` | Allowed |
| `SELECT COUNT(*) FROM ingredients WHERE name LIKE '%chicken%'` | Allowed (parens OK) |
| `PRAGMA table_info(ingredients)` | Allowed |
| `EXPLAIN SELECT * FROM ingredients` | Allowed |
| `WITH cte AS (SELECT * FROM ingredients) SELECT * FROM cte` | Allowed |
| `INSERT INTO ingredients ...` | Blocked by validateQuery |
| `DELETE FROM ingredients` | Blocked |
| `DROP TABLE ingredients` | Blocked |
| `UPDATE ingredients SET ...` | Blocked |
| `ATTACH DATABASE ...` | Blocked |
| `.shell ls /` | Blocked (dot-command) |
| `.read /etc/passwd` | Blocked (dot-command) |
| `/* comment */ DROP TABLE ingredients` | Blocked (comment stripped, DROP detected) |
| `SELECT * FROM x` (no LIMIT) | Gets `LIMIT 500` appended |
| `SELECT * FROM x LIMIT 10` | Keeps `LIMIT 10` |
| `offset: 100` | Gets `OFFSET 100` appended |

## Files Changed

- `mcp/pi/server.js` — add `validateQuery()`, add `dbPath` to `APP_CONFIG`, add tool definition and handler
- `mcp/pi/server.test.js` — add test cases for query validation and pagination

## Scope

~50-60 lines in `server.js`, ~40 lines in `server.test.js`. No new dependencies. No container changes needed (sqlite3 is already available).
