# Issue Body Template

Canonical format for all GitHub issue bodies created by skills (`create-milestone`, `create-issue`, `fix-pr`, `start-milestone`).

```markdown
## Summary
{SUMMARY}

## Milestone
[{MILESTONE_TITLE}](../../milestone/{MILESTONE_NUMBER})

## Acceptance Criteria
- [ ] {CRITERION_1}
- [ ] {CRITERION_2}

## Base Commit
`{COMMIT_HASH}`

## Task Spec
[`tasks/{TASK_FILENAME}`](https://github.com/{OWNER}/{REPO}/blob/{BRANCH}/docs/plans/{PLAN_FOLDER}/tasks/{TASK_FILENAME})

## Manual Task Prompt
**Context:** {MANUAL_CONTEXT}
**Steps:**
1. {MANUAL_STEP_1}
2. {MANUAL_STEP_2}

**Success criteria:**
- [ ] {MANUAL_CRITERION_1}

**Resources:**
- {MANUAL_RESOURCE_1}
```

## Variables

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
| `{COMMIT_HASH}` | Short commit hash at issue creation time (`git rev-parse --short HEAD`) | "abc1234" |
| `{MANUAL_CONTEXT}` | Context for the human performing the task | "Migration script from #45 is ready" |
| `{MANUAL_STEP_N}` | Steps the human needs to follow | "Run `./scripts/migrate.sh` on prod" |
| `{MANUAL_CRITERION_N}` | Success criteria for the manual task | "All records migrated without errors" |
| `{MANUAL_RESOURCE_N}` | Scripts, endpoints, or tools needed | "Script: `scripts/migrate.sh` (from #45)" |

## Rules

1. **No `## Dependencies` section.** Dependencies are handled by the `blocked_by_indices` and `blocked_by_issues` parameters of `gh_bulk_issues`. The tool automatically adds blocker lines to the issue body. Do not duplicate this in the template.

2. **`## Task Spec` not "Design Reference".** The section is called "Task Spec" because it links to the specific task file, not the overall design doc. Use a clickable GitHub link so reviewers can navigate directly to the spec.

3. **`## Task Spec` is optional.** Only include it when an implementation plan with task files exists. For quick issues (e.g., backlog items, simple bug fixes), omit the section entirely.

4. **Milestone link uses relative path.** The `../../milestone/N` format works from any issue page on GitHub.

5. **`## Base Commit` is always included.** Records the commit hash at issue creation time so you can diff against it later to see what changed before implementation starts. Get via `git rev-parse --short HEAD`.

6. **`## Manual Task Prompt` is optional.** Only include for issues labeled `manual`. Omit for all automatable issues.

## Example: Full Issue Body

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

## Base Commit
`a1b2c3d`

## Task Spec
[`tasks/03-retry-logic.md`](https://github.com/maximilianjenders/food-butler/blob/feature/phase5-variety-tracking/docs/plans/2025-06-15-variety-tracking/tasks/03-retry-logic.md)
```

## Example: Quick Issue (no task spec)

```markdown
## Summary
The stats endpoint returns 500 when called with an empty date range.

## Milestone
[Backlog](../../milestone/1)

## Acceptance Criteria
- [ ] Return 400 with descriptive error for empty date range
- [ ] Add test for empty date range case

## Base Commit
`a1b2c3d`
```
