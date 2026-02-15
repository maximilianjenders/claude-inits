# Phase Reviewer Prompt Template

Use this template when dispatching a review agent to review all changes from a phase before the orchestrator commits.

**Key difference from PR review:** Phase review happens on UNCOMMITTED changes. The orchestrator pre-computes diffs and agent summaries to avoid redundant work.

## Dispatch Pattern

```
Task tool (general-purpose):
  description: "Review Phase N changes"
  prompt: |
    Review the implementation work from Phase N of milestone "[Milestone Title]".

    ## Phase Context

    **Issues in this phase:**
    - #70: [title] - [brief acceptance criteria summary]
    - #71: [title] - [brief acceptance criteria summary]
    - #72: [title] - [brief acceptance criteria summary]

    **Branch:** `feature/branch-name`
    **Working directory:** [path]
    **Design doc:** [design_doc_path or "None"]

    **Important:** These changes are UNCOMMITTED. The orchestrator has pre-computed the diffs below.

    ## Changes to Review

    ### Diff Summary (pre-computed)
    [paste git diff --stat output here]

    ### Full Diff (pre-computed)
    [paste git diff output here]

    ### Agent Reports
    [For each issue: what was implemented, files changed, self-review findings]
    - **#70:** [agent summary]
    - **#71:** [agent summary]
    - **#72:** [agent summary]

    ## Your Task

    Use the `superpowers:requesting-code-review` skill to review these changes.

    **Use the pre-computed diff above.** Only read individual files if the diff is unclear or you need surrounding context for a specific concern.

    Provide this context to the review:
    1. **Scope:** The acceptance criteria for each issue listed above
    2. **Standards:** Read CLAUDE.md for project coding standards
    3. **Design doc:** Read the design doc at [design_doc_path] to verify design compliance (if provided)

    ## Phase-Specific Review Focus

    In addition to standard code review concerns, pay special attention to:

    ### Cross-Issue Consistency
    - Do all issues use consistent patterns?
    - Are naming conventions consistent across the changes?
    - Are similar problems solved the same way?

    ### Integration
    - Do the changes from different issues work together?
    - Are there conflicts or overlaps between issues?
    - Does the combined result make sense as a whole?

    ## Output Format

    After running the code review skill, report:

    **If APPROVED:**
    ```
    ## Phase Review: APPROVED

    All issues pass review. Ready for orchestrator to commit.

    Summary:
    - #70: [brief note]
    - #71: [brief note]
    - #72: [brief note]

    Cross-issue consistency: OK
    ```

    **If CHANGES REQUESTED:**
    ```
    ## Phase Review: CHANGES REQUESTED

    ### Issues Needing Fixes

    **#70: [title]**
    - [ ] [specific issue and fix needed]

    **#71: [title]**
    - Approved

    ### Cross-Issue Concerns
    - [any consistency or integration issues]

    Fix agents should address the listed issues, then request re-review.
    ```
```

## Checklist

**Follow this checklist for every phase review.**

### Setup
- [ ] Review the pre-computed diff summary for scope
- [ ] Read the pre-computed full diff
- [ ] Read agent reports for context on each issue
- [ ] Read CLAUDE.md for project standards
- [ ] Read design doc (if `design_doc_path` provided)

### Review Execution
- [ ] Invoke `superpowers:requesting-code-review` skill
- [ ] Only read individual files if diff is unclear or you need surrounding context
- [ ] Do NOT run tests or linters — pre-commit hooks handle both at commit time

### Phase-Specific Checks
- [ ] **Cross-issue consistency:** Same patterns used across all issues?
- [ ] **Naming conventions:** Consistent across changes?
- [ ] **Integration:** Do changes from different issues work together?
- [ ] **Conflicts/overlaps:** Any issues between changes?

### Decision
- [ ] If ALL checks pass → Report **APPROVED**
- [ ] If ANY issues found → Report **CHANGES REQUESTED** with specific feedback per issue

### Output
- [ ] List each issue with approval status or specific fixes needed
- [ ] Note any cross-issue concerns

## Key Points

- **Uses `superpowers:requesting-code-review`** for consistent review standards
- **Pre-computed diffs** — orchestrator stages all changes (`git add -A`), then captures `git diff --cached --stat` and `git diff --cached`. Changes stay staged for the batch commit step.
- **Agent summaries** — orchestrator collects what each agent built, files changed, and self-review findings
- **Design doc access** — reviewer receives `design_doc_path` to verify design compliance
- **Fresh agent** - no implementation bias, dedicated context for review
- **Quality gate** - must approve before orchestrator commits
