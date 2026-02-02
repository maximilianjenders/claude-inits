# Fix Agent Prompt Template

Use this template when dispatching an agent to address specific feedback from code review.

**When to use:** After phase review requests changes on specific issues.

```
Task tool (general-purpose):
  description: "Fix review feedback for #N"
  prompt: |
    You are fixing specific issues found during code review for Issue #N: [issue title]

    ## Review Feedback

    The reviewer found the following issues that need to be fixed:

    [PASTE EXACT FEEDBACK FROM REVIEWER]

    Example:
    - [ ] Variable `data` should be renamed to `monthly_totals` for clarity
    - [ ] Missing null check in `calculate_growth()` - will crash if previous month has no data
    - [ ] Test `test_category_breakdown` doesn't cover the empty state

    ## Context

    Branch: `feature/branch-name`
    Working directory: [path]

    ## Your Job

    ### Step 1: Understand the Feedback

    Read the reviewer's feedback carefully. Make sure you understand:
    - What exactly is wrong
    - What the fix should be
    - Why this matters

    If anything is unclear, ask before proceeding.

    ### Step 2: Make Targeted Fixes

    Fix ONLY what the reviewer requested. Do not:
    - Refactor unrelated code
    - Add features not mentioned
    - "Improve" things the reviewer didn't mention

    For each feedback item:
    1. Locate the code
    2. Make the specific fix
    3. Verify the fix addresses the feedback

    ### Step 3: Verify

    ```bash
    # Run tests to ensure fix doesn't break anything
    [project test command]

    # Run linters
    [project lint command]
    ```

    ### Step 4: Mark Ready for Review

    After fixes are complete and tests pass:
    ```
    mcp__workflow__gh_update_issue(issue=N, add_labels=["ready-for-review"])
    ```

    Note: The issue should already have `ready-for-review` label from before.
    If it was removed, add it back.

    ### ⚠️ DO NOT Commit

    **You must NOT:**
    - Run `git commit`
    - Close the issue
    - Mark as `code-complete`

    The orchestrator will commit after the re-review passes.

    ## Report Format

    When done, report:
    - Each feedback item and how you addressed it
    - Any tests you added or modified
    - Files changed
    - Test results

    Example:
    ```
    ## Fixes Applied

    ✓ Renamed `data` → `monthly_totals` in src/analytics.py:45
    ✓ Added null check in `calculate_growth()` at src/analytics.py:78
    ✓ Added test `test_category_breakdown_empty_state` in tests/test_analytics.py

    Files changed:
    - src/analytics.py
    - tests/test_analytics.py

    Tests: All passing (42 passed)
    ```
```

## Key Points

- **Fix ONLY what's requested** - Don't scope creep
- **DO NOT COMMIT** - Orchestrator handles commits
- **Verify with tests** - Don't break existing functionality
- **Be specific in report** - Show exactly what you changed and where
