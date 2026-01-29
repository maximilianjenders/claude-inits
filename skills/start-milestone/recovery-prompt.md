# Recovery Subagent Prompt Template

Use this template when dispatching a subagent to continue work on an in-progress issue after a crash or interruption.

```
Task tool (general-purpose):
  description: "Continue Issue #N: [issue title]"
  prompt: |
    You are continuing work on Issue #N: [issue title]

    **This issue was already in-progress but work was interrupted.**

    ## Issue Description

    [FULL TEXT of issue body - paste it here]

    ## Context

    This issue is part of milestone "[Milestone Title]".
    Branch: `feature/branch-name`
    Working directory: [path]

    ### Prior Work Found

    **Commits mentioning this issue:**
    [List commits with SHAs and messages, or "None found"]

    **Current test status:**
    [Test output summary, or "Unknown"]

    **Files potentially modified:**
    [List of files from git status/diff related to this work]

    ## Before You Begin

    **Read CLAUDE.md first** for project commands and conventions.

    ### Assess Current State

    Before continuing, you must understand what was done:

    1. **Check existing commits:**
       ```bash
       git log --oneline --grep="#N" | head -10
       ```

    2. **Check current changes:**
       ```bash
       git status
       git diff
       ```

    3. **Run tests:**
       ```bash
       # Use project-specific test command from CLAUDE.md
       ```

    4. **Review acceptance criteria:**
       Which criteria are met? Which remain?

    ### Report Your Assessment

    Before proceeding, report:
    - What has been completed
    - What remains to be done
    - Any issues or blockers found
    - Whether you can continue or need guidance

    ## Your Job (After Assessment)

    If you can continue:

    ### Step 1: Continue Implementation

    Pick up where the previous work left off.
    Follow TDD for any remaining work.

    ### Step 2: Verify

    - Run all tests
    - Check that all acceptance criteria are met
    - Verify no regressions

    ### Step 3: Commit

    Commit any new work:
    ```
    (type): Brief summary

    Refs #N
    ```

    ### Step 4: Self-Review

    Review your work for completeness and quality:

    **Completeness:**
    - Are all acceptance criteria met?
    - Any edge cases missed?

    **Quality:**
    - Clean, maintainable code?
    - Clear naming?

    **Code Standards (from CLAUDE.md):**
    - Re-read the "MUST ALWAYS", "SHOULD", and "MUST NOT" sections
    - Verify compliance with each applicable rule
    - Check any linked style guides or conventions documents
    - Run linters/formatters if specified

    Fix any issues found.

    ### Step 5: Mark Ready for Review

    After self-review passes:
    ```bash
    gh issue edit N --remove-label "in-progress" --add-label "ready-for-review"
    ```

    ## Report Format

    When done, report:
    - Assessment of prior work
    - What you implemented/completed
    - What you tested and test results
    - Files changed
    - Commits made (include SHAs)
    - Any issues or concerns

    ## If Blocked

    If you find the work cannot be continued:
    - Report what's blocking progress
    - Do NOT mark as ready-for-review
    - Leave as in-progress for manual intervention

    ## Label Flow Reference

    ```
    (none) → in-progress → ready-for-review → code-complete
                       ↘ blocked-failed (on failure)
    ```
```

## Key Points

- **Assess before acting** - Understand what was done before continuing
- **Check test status** - Tests tell you what's working
- **Report assessment first** - Don't assume you can continue
- **Use same label flow** - Recovery follows the same workflow
- **Leave in-progress if blocked** - Don't mark ready if work can't complete
