# Shared Templates

Single source of truth for templates used across multiple skills. Skills should reference this file rather than duplicating these patterns.

## How to Use This File

Skills that need these templates should:
1. Reference this file: `See skills/shared/templates.md for the canonical template`
2. Show only a brief example inline if needed for readability
3. Document any skill-specific additions (e.g., `pr-review` label for fix-pr issues)

When constructing issue bodies or plan folders, follow these templates exactly. Variable placeholders are marked with `{VARIABLE_NAME}` and documented in each section.

---

## Issue Body Template

This is the canonical format for all GitHub issue bodies created by skills (`create-milestone`, `create-issue`, `fix-pr`, `start-milestone`).

```markdown
## Summary
{SUMMARY}

## Milestone
[{MILESTONE_TITLE}](../../milestone/{MILESTONE_NUMBER})

## Acceptance Criteria
- [ ] {CRITERION_1}
- [ ] {CRITERION_2}

## Task Spec
[`tasks/{TASK_FILENAME}`](https://github.com/{OWNER}/{REPO}/blob/{BRANCH}/docs/plans/{PLAN_FOLDER}/tasks/{TASK_FILENAME})
```

### Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{SUMMARY}` | From implementation plan task description | "Add retry logic to the payment endpoint" |
| `{MILESTONE_TITLE}` | Milestone name (without status prefix) | "Phase 5: Variety Tracking" |
| `{MILESTONE_NUMBER}` | GitHub milestone number | "5" |
| `{CRITERION_1}`, etc. | From implementation plan task acceptance criteria | "Retry up to 3 times with exponential backoff" |
| `{OWNER}` | GitHub repository owner | "maximilianjenders" |
| `{REPO}` | GitHub repository name | "food-butler" |
| `{BRANCH}` | Working branch for the milestone | "feature/phase5-variety-tracking" |
| `{PLAN_FOLDER}` | Date-prefixed plan folder name | "2025-06-15-variety-tracking" |
| `{TASK_FILENAME}` | Task file name (zero-padded number + kebab-case) | "01-ingredient-model.md" |

### Rules

1. **No `## Dependencies` section.** Dependencies are handled by the `blocked_by_indices` and `blocked_by_issues` parameters of `gh_bulk_issues`. The tool automatically adds blocker lines to the issue body. Do not duplicate this in the template.

2. **`## Task Spec` not "Design Reference".** The section is called "Task Spec" because it links to the specific task file, not the overall design doc. Use a clickable GitHub link so reviewers can navigate directly to the spec.

3. **`## Task Spec` is optional.** Only include it when an implementation plan with task files exists. For quick issues (e.g., backlog items, simple bug fixes), omit the section entirely.

4. **Milestone link uses relative path.** The `../../milestone/N` format works from any issue page on GitHub.

### Example: Full Issue Body

```markdown
## Summary
Add exponential backoff retry logic to the payment processing endpoint to handle transient failures gracefully.

## Milestone
[Phase 5: Variety Tracking](../../milestone/5)

## Acceptance Criteria
- [ ] Retry up to 3 times with exponential backoff (1s, 2s, 4s)
- [ ] Log each retry attempt with context
- [ ] Return 503 after all retries exhausted
- [ ] Add tests for retry behavior

## Task Spec
[`tasks/03-retry-logic.md`](https://github.com/maximilianjenders/food-butler/blob/feature/phase5-variety-tracking/docs/plans/2025-06-15-variety-tracking/tasks/03-retry-logic.md)
```

### Example: Quick Issue (no task spec)

```markdown
## Summary
The stats endpoint returns 500 when called with an empty date range.

## Milestone
[Backlog](../../milestone/1)

## Acceptance Criteria
- [ ] Return 400 with descriptive error for empty date range
- [ ] Add test for empty date range case
```

---

## Plan Folder Structure

This is the canonical layout for implementation plans. Used by `writing-implementation-tasks`, `create-issue --plan`, and `fix-pr` (for complex feedback).

```
docs/plans/{PLAN_FOLDER}/
├── design.md              # Design doc (from brainstorming, if it exists)
├── summary.md             # Implementation tracking + dependency graph
└── tasks/
    ├── 01-short-name.md   # Detailed task (~250 lines, full code, TDD)
    ├── 02-short-name.md
    └── ...
```

### Variables

| Variable | Format | Example |
|----------|--------|---------|
| `{PLAN_FOLDER}` | `YYYY-MM-DD-<kebab-case-feature>` | `2025-06-15-variety-tracking` |

### File Naming

- **Folder:** `YYYY-MM-DD-<feature>` using today's date and a short kebab-case name
- **Task files:** `NN-short-name.md` where NN is zero-padded (01, 02, ...) and short-name is kebab-case

### Files

| File | Required | Contents |
|------|----------|----------|
| `design.md` | No (skip if no brainstorming session) | Design exploration, architecture decisions, trade-offs |
| `summary.md` | Yes | Task table, dependency graph, architectural notes |
| `tasks/NN-name.md` | Yes (one per task) | Self-contained task with full detail, code examples, TDD steps |

### Why This Structure

Each task file is self-contained (~250 lines) so an implementation agent can load just the task it needs without consuming the entire plan. The summary provides the orchestrator with the dependency graph without requiring it to read every task file.
