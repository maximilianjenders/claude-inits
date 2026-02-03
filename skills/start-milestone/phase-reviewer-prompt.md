# Phase Reviewer Prompt Template

Use this template when dispatching a review agent to review all changes from a phase before the orchestrator commits.

**Key difference from PR review:** Phase review happens on UNCOMMITTED changes. The reviewer checks `git diff`, not commits.

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

    **Important:** These changes are UNCOMMITTED. Review using `git diff`, not commit history.

    ## Your Task

    Use the `superpowers:requesting-code-review` skill to review these changes.

    Provide this context to the review:
    1. **Scope:** The acceptance criteria for each issue listed above
    2. **Standards:** Read CLAUDE.md for project coding standards
    3. **Design doc:** [path to design doc if exists, or "None"]

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

    ### Uncommitted State
    - Run `git diff` to see all changes
    - Run `git status` to see which files are modified
    - Changes span multiple issues - attribute correctly

    ## Verification Commands

    ```bash
    # View all uncommitted changes
    git diff

    # Run tests
    [project test command]

    # Run linters
    [project lint command]
    ```

    ## Output Format

    After running the code review skill, report:

    **If APPROVED:**
    ```
    ## Phase Review: APPROVED

    All issues pass review. Ready for orchestrator to commit.

    Summary:
    - #70: ✓ [brief note]
    - #71: ✓ [brief note]
    - #72: ✓ [brief note]

    Cross-issue consistency: ✓
    Tests: ✓ All passing
    ```

    **If CHANGES REQUESTED:**
    ```
    ## Phase Review: CHANGES REQUESTED

    ### Issues Needing Fixes

    **#70: [title]**
    - [ ] [specific issue and fix needed]

    **#71: [title]**
    - ✓ Approved

    ### Cross-Issue Concerns
    - [any consistency or integration issues]

    Fix agents should address the listed issues, then request re-review.
    ```
```

## Checklist

**Follow this checklist for every phase review.**

### Setup
- [ ] Understand which issues are in this phase
- [ ] Read acceptance criteria for each issue
- [ ] Read CLAUDE.md for project standards
- [ ] Read design doc (if exists)

### Review Execution
- [ ] Run `git diff` to see ALL uncommitted changes
- [ ] Run `git status` to see modified files
- [ ] Invoke `superpowers:requesting-code-review` skill
- [ ] Run tests to verify they pass
- [ ] Run linters

### Phase-Specific Checks
- [ ] **Cross-issue consistency:** Same patterns used across all issues?
- [ ] **Naming conventions:** Consistent across changes?
- [ ] **Integration:** Do changes from different issues work together?
- [ ] **Conflicts/overlaps:** Any issues between changes?

### Decision
- [ ] If ALL checks pass → Report **APPROVED**
- [ ] If ANY issues found → Report **CHANGES REQUESTED** with specific feedback per issue

### Output
- [ ] List each issue with ✓ (approved) or specific fixes needed
- [ ] Note any cross-issue concerns
- [ ] Include test results

## Key Points

- **Uses `superpowers:requesting-code-review`** for consistent review standards
- **Adds phase-specific context** (cross-issue consistency, uncommitted changes)
- **Fresh agent** - no implementation bias, dedicated context for review
- **Quality gate** - must approve before orchestrator commits
