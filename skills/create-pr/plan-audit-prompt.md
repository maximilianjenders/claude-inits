# Plan Audit Prompt Template

Use this template when dispatching a plan audit agent to compare the design document and implementation plan against actual implementation. Runs as a separate agent from the code reviewer.

## Dispatch Pattern

```
Task tool (general-purpose):
  description: "Audit plan vs implementation for PR #N"
  prompt: |
    Audit the implementation of PR #[PR_NUMBER] ([branch_name]) against its design document and implementation plan.

    ## Context

    **PR:** #[PR_NUMBER] — [PR title]
    **Branch:** `[branch_name]` → `[base_branch]`
    **Milestone:** [milestone_title]
    **Working directory:** [path]
    **Design doc:** [design_doc_path or "None"]
    **Implementation plan:** [implementation_plan_path or "None"]

    **Issues in this PR:**
    - #12: [title] - [brief acceptance criteria summary]
    - #13: [title] - [brief acceptance criteria summary]
    - #14: [title] - [brief acceptance criteria summary]

    ## Changes (pre-computed)

    Diff computed at merge base [MERGE_BASE_SHORT_HASH].

    ### Diff Summary
    [paste git diff --stat $MERGE_BASE..HEAD output here]

    ### Full Diff
    [paste git diff $MERGE_BASE..HEAD output here — OR large diff mode note below]

    > **Large diff mode (if diff > 1000 lines):** Only the stat summary is inlined.
    > Pull per-file diffs using `git diff [MERGE_BASE]..HEAD -- <file>` as needed.

    ## Your Task

    Read the design document and implementation plan fully, then systematically check the implementation against them.

    ### Audit Checklist

    1. **Feature completeness** — Walk through each section/requirement in the design doc. Does the diff contain corresponding code changes? List each feature and its status (implemented, partially implemented, missing).

    2. **Acceptance criteria** — For each issue listed above, check every acceptance criterion against the actual code changes. Be specific — "backend supports it" does not satisfy a frontend criterion.

    3. **API contracts** — Do implemented endpoints, request/response shapes, and error handling match the design doc's API spec? Note any deviations.

    4. **Data model** — Do migrations, models, and schemas match the design doc's data model? Check field names, types, constraints, relationships.

    5. **Backend-frontend wiring** — For every new or changed API endpoint, verify the frontend actually calls it. For every new UI feature, verify there's a backend endpoint supporting it. Check that request/response shapes match between frontend fetch calls and backend handlers. Unwired code (backend endpoint nobody calls, frontend component hitting a non-existent route) is a gap.

    6. **Edge cases and error handling** — Does the design doc mention error scenarios, validation rules, or edge cases that aren't handled in the implementation?

    7. **Intentional omissions vs gaps** — Some things may have been deliberately descoped during implementation. Check issue comments, commit messages, and plan annotations for evidence of intentional deferral. Separate these from unintentional gaps.

    If no design doc or implementation plan is available, report that and skip the audit.

    ## Output Format

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

    2. **[Feature/requirement name]**
       - Source: ...
       - Expected: ...
       - Actual: ...
       - Severity: ...

    ### Intentional Omissions
    - [Item]: [evidence it was deliberately deferred, e.g., "descoped in issue #N comment"]

    ### Coverage Summary
    - [Feature area 1]: Fully implemented
    - [Feature area 2]: Partially implemented (see gap #1)
    - [N] acceptance criteria checked, [M] satisfied, [K] gaps
    ```

    Be thorough but precise. Only flag genuine gaps — if the implementation achieves the requirement through a different approach than the design doc suggested, that's fine as long as the requirement is met.
```

## Checklist

**Follow this checklist for every plan audit dispatch.**

### Preparation (orchestrator does this BEFORE dispatching)
- [ ] Get stat diff: `mcp__workflow__git_diff(mode="stat")` → captures merge_base_short
- [ ] Get full diff: `mcp__workflow__git_diff(mode="full")`
- [ ] Check diff line count — if > 1000 lines, use large diff mode
- [ ] Gather linked issue titles and acceptance criteria from milestone
- [ ] Get design doc path from milestone description (if any)
- [ ] Get implementation plan path (typically `docs/plans/` or linked from milestone)

### Dispatch
- [ ] Fill in the template above with pre-computed data
- [ ] Dispatch audit agent with `Task` tool (general-purpose)
- [ ] Can run **in parallel** with the code reviewer agent — they're independent

## Key Points

- **Separate from code review** — this agent checks plan adherence only, not code quality
- **User gate** — if gaps found, orchestrator MUST present them to the user before proceeding to deploy
- **Parallel dispatch** — audit and code review agents can run simultaneously since they both use pre-computed diffs
- **No auto-fix** — gaps are presented to the user for decision (accept, defer, or fix now)
