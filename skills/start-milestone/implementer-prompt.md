# Implementer Subagent Prompt Template

Use this template when dispatching an implementation subagent for a milestone issue.

**IMPORTANT:** Agents do NOT commit or close issues. They implement, test, self-review, and mark `ready-for-review`. The orchestrator handles commits and closing after phase review.

```
Task tool (general-purpose):
  description: "Implement Issue #N: [issue title]"
  prompt: |
    You are implementing Issue #N: [issue title]

    ## Issue Description

    [FULL TEXT of issue body - paste it here, don't make subagent fetch it]

    ## Context

    This issue is part of milestone "[Milestone Title]".
    Branch: `feature/branch-name`
    Working directory: [path]

    ### Dependencies
    - Depends on: [list completed issues this builds on]
    - Enables: [list issues waiting on this one]

    ## Before You Begin

    **Read CLAUDE.md first** for project commands and conventions.

    If you have questions about:
    - The requirements or acceptance criteria
    - The approach or implementation strategy
    - Dependencies or assumptions
    - Anything unclear in the issue description

    **Ask them now.** Raise any concerns before starting work.

    ## Your Job

    ### Step 1: Mark Issue In-Progress

    First, mark the issue as in-progress using the MCP workflow tool:
    ```
    mcp__workflow__gh_update_issue(issue=N, add_labels=["in-progress"])
    ```

    Fallback (if MCP unavailable):
    ```bash
    gh issue edit N --add-label "in-progress"
    ```

    ### Step 2: Implement

    Follow TDD (Test-Driven Development):
    1. Write failing tests first
    2. Implement to make tests pass
    3. Refactor if needed

    Work through each acceptance criterion systematically.

    ### Step 3: Verify

    - Run all tests (full suite, not just new tests)
    - Check that acceptance criteria are met
    - Verify no regressions
    - Run linters/formatters

    ### Step 4: Self-Review

    Before marking ready, review your work:

    **Completeness:**
    - Did I fully implement everything in the acceptance criteria?
    - Did I miss any requirements?
    - Are there edge cases I didn't handle?

    **Quality:**
    - Is this my best work?
    - Are names clear and accurate?
    - Is the code clean and maintainable?

    **Discipline:**
    - Did I avoid overbuilding (YAGNI)?
    - Did I only build what was requested?
    - Did I follow existing patterns in the codebase?

    **Code Standards (from CLAUDE.md):**
    - Re-read the "MUST ALWAYS", "SHOULD", and "MUST NOT" sections in CLAUDE.md
    - Verify compliance with each applicable rule
    - Check any linked style guides or conventions documents

    If you find issues during self-review, fix them now.

    ### Step 5: Mark Ready for Review

    After self-review passes and all tests pass:
    ```
    mcp__workflow__gh_update_issue(issue=N, remove_labels=["in-progress"], add_labels=["ready-for-review"])
    ```

    Fallback (if MCP unavailable):
    ```bash
    gh issue edit N --remove-label "in-progress" --add-label "ready-for-review"
    ```

    **Important:** Only mark ready-for-review if:
    - All acceptance criteria are met
    - All tests pass
    - Self-review found no issues (or you fixed them)

    If you cannot complete the issue, leave it with `in-progress` label and report what's blocking you.

    ### ⚠️ DO NOT Commit or Close

    **You must NOT:**
    - Run `git commit`
    - Close the issue
    - Mark as `code-complete`

    The orchestrator will commit your changes after the phase review passes.
    This prevents git conflicts when multiple agents work in parallel.

    ## Report Format

    When done, report:
    - What you implemented
    - What you tested and test results
    - Files changed (list them for orchestrator to commit)
    - Self-review findings (if any)
    - Any issues or concerns

    ## Label Flow Reference

    ```
    Your responsibility:
      (none) → in-progress → ready-for-review
               [working]     [done, awaiting review & commit]

    Orchestrator handles:
      ready-for-review → code-complete (closed)
      [after commit]
    ```
```

## Checklist

**Follow this checklist in order. DO NOT skip the constraints at the end.**

### Before Starting
- [ ] Read CLAUDE.md for project commands and conventions
- [ ] Review issue description and acceptance criteria
- [ ] **Ask questions NOW** if anything is unclear (don't guess)

### Implementation
- [ ] Mark issue `in-progress` (add label)
- [ ] Write failing tests first (TDD)
- [ ] Implement to make tests pass
- [ ] Run full test suite (not just new tests)
- [ ] Run linters/formatters

### Self-Review
- [ ] All acceptance criteria met?
- [ ] Edge cases handled?
- [ ] Code follows CLAUDE.md rules?
- [ ] Names clear and accurate?

### Completion
- [ ] Mark `ready-for-review` (swap labels)
- [ ] Report: what implemented, files changed, test results

### ⚠️ CRITICAL CONSTRAINTS
- [ ] **I have NOT run `git commit`**
- [ ] **I have NOT closed the issue**
- [ ] **I have NOT marked `code-complete`**

The orchestrator commits after phase review. Committing would cause git conflicts with parallel agents.

## Key Points

- **DO NOT COMMIT** - Orchestrator commits after phase review to avoid git conflicts
- **DO NOT CLOSE ISSUES** - Orchestrator closes after committing
- **Mark labels immediately** - Labels are the source of truth for progress tracking
- **Follow TDD** - Write tests first, implement to pass
- **Reference CLAUDE.md** - Project-specific commands and conventions
- **Self-review before marking ready** - Catch issues before handoff to review
- **Ask questions early** - Don't guess on unclear requirements
- **Report files changed** - Orchestrator needs this list to commit correctly
