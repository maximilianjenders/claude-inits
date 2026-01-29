# Implementer Subagent Prompt Template

Use this template when dispatching an implementation subagent for a milestone issue.

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

    First, mark the issue as in-progress:
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

    - Run all tests
    - Check that acceptance criteria are met
    - Verify no regressions

    ### Step 4: Commit

    Commit your work with a descriptive message:
    ```
    (type): Brief summary

    Refs #N
    ```

    ### Step 5: Self-Review

    Before reporting back, review your work:

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
    - Run linters/formatters if specified in CLAUDE.md

    If you find issues during self-review, fix them now.

    ### Step 6: Mark Ready for Review

    After self-review passes:
    ```bash
    gh issue edit N --remove-label "in-progress" --add-label "ready-for-review"
    ```

    ## Report Format

    When done, report:
    - What you implemented
    - What you tested and test results
    - Files changed
    - Commits made (include SHAs)
    - Self-review findings (if any)
    - Any issues or concerns

    ## Label Flow Reference

    ```
    (none) → in-progress → ready-for-review → code-complete
                       ↘ blocked-failed (on failure)
    ```
```

## Key Points

- **Mark labels immediately** - Labels are the source of truth for progress tracking
- **Follow TDD** - Write tests first, implement to pass
- **Reference CLAUDE.md** - Project-specific commands and conventions
- **Self-review before reporting** - Catch issues before handoff to review
- **Ask questions early** - Don't guess on unclear requirements
