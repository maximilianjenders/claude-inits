# Plan Folder Structure

Canonical layout for implementation plans. Used by `writing-implementation-tasks`, `create-issue --plan`, and `fix-pr` (for complex feedback).

```
docs/plans/{PLAN_FOLDER}/
├── design.md              # Design doc (from brainstorming, if it exists)
├── summary.md             # Implementation tracking + dependency graph
└── tasks/
    ├── 01-short-name.md   # Detailed task (~250 lines, full code, TDD)
    ├── 02-short-name.md
    └── ...
```

## Variables

| Variable | Format | Example |
|----------|--------|---------|
| `{PLAN_FOLDER}` | `YYYY-MM-DD-<kebab-case-feature>` | `2025-06-15-variety-tracking` |

## File Naming

- **Folder:** `YYYY-MM-DD-<feature>` using today's date and a short kebab-case name
- **Task files:** `NN-short-name.md` where NN is zero-padded (01, 02, ...) and short-name is kebab-case

## Files

| File | Required | Contents |
|------|----------|----------|
| `design.md` | No (skip if no brainstorming session) | Design exploration, architecture decisions, trade-offs |
| `summary.md` | Yes | Task table, dependency graph, architectural notes |
| `tasks/NN-name.md` | Yes (one per task) | Self-contained task with full detail, code examples, TDD steps |

## Why This Structure

Each task file is self-contained (~250 lines) so an implementation agent can load just the task it needs without consuming the entire plan. The summary provides the orchestrator with the dependency graph without requiring it to read every task file.
