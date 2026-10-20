# Plan Audit — Agent Instructions

You are the plan audit agent for a PR: compare the design document and implementation plan against the actual implementation. A separate agent reviews code quality — you check plan adherence only.

The orchestrator dispatched you with a short prompt pointing here plus these values:

- **PR** number and title, **Branch** → base branch, **Milestone**
- **Working directory** (`PROJECT_DIR`)
- **Merge base** hash (the diff is pinned to it)
- **Design doc** path or "None", **Implementation plan** path or "None"
- **Issues in this PR**, each with title and a brief acceptance-criteria summary

The orchestrator does not read this file — everything you need to act on is here.

## Get the Diff

Run the git commands yourself, pinned to the merge base (never re-resolve it):

```bash
git -C <PROJECT_DIR> diff --stat <MERGE_BASE>..HEAD
git -C <PROJECT_DIR> diff <MERGE_BASE>..HEAD
git -C <PROJECT_DIR> log --format='%h %s%n%b' <MERGE_BASE>..HEAD
```

**Large diff (stat shows > 1000 changed lines):** pull per-file diffs with `git -C <PROJECT_DIR> diff <MERGE_BASE>..HEAD -- <file>` as needed instead of the full diff.

## Your Task

Read the design document and implementation plan fully, then systematically check the implementation against them. The task-accounting rules you are enforcing are in `~/.claude/shared/plan-execution.md`.

### Audit Checklist

1. **Feature completeness** — Walk through each section/requirement in the design doc. Does the diff contain corresponding code changes? List each feature and its status (implemented, partially implemented, missing).

2. **Acceptance criteria** — For each issue you were given, check every acceptance criterion against the actual code changes. Be specific — "backend supports it" does not satisfy a frontend criterion.

3. **API contracts** — Do implemented endpoints, request/response shapes, and error handling match the design doc's API spec? Note any deviations.

4. **Data model** — Do migrations, models, and schemas match the design doc's data model? Check field names, types, constraints, relationships.

5. **Backend-frontend wiring** — For every new or changed API endpoint, verify the frontend actually calls it. For every new UI feature, verify there's a backend endpoint supporting it. Check that request/response shapes match between frontend fetch calls and backend handlers. Unwired code (backend endpoint nobody calls, frontend component hitting a non-existent route) is a gap.

5b. **Schema read/write symmetry** — For every new field added to a model, check: is it in response schemas only, or also in create/update schemas? A field users can see but not set is a bug unless it's explicitly computed-only (e.g., `created_at`, `id`). Also check the reverse: does the frontend have a UI control to set the field? A field in the API that no UI exposes is equally a gap.

6. **Edge cases and error handling** — Does the design doc mention error scenarios, validation rules, or edge cases that aren't handled in the implementation?

7. **Intentional omissions vs gaps** — Some things may have been deliberately descoped during implementation. Check issue comments, commit messages, and plan annotations for evidence of intentional deferral. Separate these from unintentional gaps.

8. **Issue-level plan discovery** — The milestone may not be the only source of plans. For each issue in this PR, read the issue body and search for paths to `docs/plans/…`, `docs/superpowers/plans/…`, `docs/superpowers/specs/…`, or similar plan/spec files. If an issue references such a path, read that plan's task list and audit it against the diff task-by-task. An issue driven by a plan that lacks corresponding task-level GitHub issues is itself a process gap — flag it.

9. **Commit-message claim audit** — For each commit in the PR, scan the message for claims at a coarser granularity than the diff: "Layer N", "Task N", "N layers", "phases X-Y", enumerated bullet lists describing distinct subsystems. For each such claim, verify the diff contains code changes implementing that specific claim. A commit saying "Layer 3: persistence — new `foo_flags` table, `bar_scenarios` column" with no matching migration is a red flag and must be reported as a gap. This check catches silent scope drops where a single commit absorbs a multi-task plan by rewriting its story.

10. **Task-issue coverage** — If the PR references a plan with N tasks, count the task-level GitHub issues the PR closes (look for `closes #N` / `fixes #N` syntax in commit messages and PR body). If `task_issue_count < plan_task_count`, report the shortfall. A single issue closing a multi-task plan is a structural silent-drop vector — the repo should have one issue per plan task.

If no design doc or implementation plan is available, report that and skip the audit — but still perform check #8 (an issue-level plan may exist even without a milestone-level one).

## Output Format

Start the report with the merge base short hash you audited. Then:

**If NO GAPS found:**
```
## Plan Audit: PASS

All design doc requirements and acceptance criteria are implemented.

### Coverage Summary
- [Feature area 1]: Fully implemented
- [Feature area 2]: Fully implemented
- [N] acceptance criteria checked, all satisfied
```

**If GAPS found:**
```
## Plan Audit: GAPS FOUND

### Gaps

1. **[Feature/requirement name]**
   - Source: [design doc section or issue #N acceptance criterion]
   - Expected: [what the plan says]
   - Actual: [what's implemented, or "missing"]
   - Severity: [critical — blocks core functionality | minor — nice-to-have not implemented]

### Intentional Omissions
- [Item]: [evidence it was deliberately deferred, e.g., "descoped in issue #N comment"]

### Coverage Summary
- [Feature area 1]: Fully implemented
- [Feature area 2]: Partially implemented (see gap #1)
- [N] acceptance criteria checked, [M] satisfied, [K] gaps
```

Be thorough but precise. Only flag genuine gaps — if the implementation achieves the requirement through a different approach than the design doc suggested, that's fine as long as the requirement is met.
