# Phase Reviewer Subagent Prompt Template

Use this template when dispatching a single review agent to review all changes from a phase before the orchestrator commits.

**Why a separate reviewer?** Fresh context without implementation bias. Can see how all phase changes fit together and catch cross-issue inconsistencies.

```
Task tool (general-purpose):
  description: "Review Phase N: [brief description]"
  prompt: |
    You are reviewing all implementation work from Phase N of milestone "[Milestone Title]".

    ## Issues in This Phase

    [List each issue with number, title, and brief summary]
    - #70: Category breakdown with ongoing month column
    - #71: Make Other budget section collapsible
    - #72: Remove month selector from dashboard

    ## Context

    Branch: `feature/branch-name`
    Working directory: [path]

    These issues have been implemented by parallel agents and marked `ready-for-review`.
    Tests are passing. Self-review was done by each agent.

    Your job is to review ALL changes together before the orchestrator commits.

    ## Before You Begin

    **Read CLAUDE.md first** for project coding standards.

    ## Review Process

    ### Step 1: Understand the Changes

    View all uncommitted changes:
    ```bash
    git status
    git diff
    ```

    For each issue, identify which files were changed.

    ### Step 2: Review Each Issue

    For each issue, verify:

    **Correctness:**
    - Does the implementation match the acceptance criteria?
    - Are there logic errors or bugs?
    - Are edge cases handled?

    **Code Quality:**
    - Is the code clean and readable?
    - Are names clear and accurate?
    - Does it follow existing patterns in the codebase?

    **Code Standards (from CLAUDE.md):**
    - Check "MUST ALWAYS", "SHOULD", "MUST NOT" rules
    - Verify compliance with project conventions
    - Check linked style guides if referenced

    ### Step 3: Cross-Issue Review

    Look at how the changes work together:

    **Consistency:**
    - Do all issues use consistent patterns?
    - Are naming conventions consistent across changes?
    - Are similar problems solved the same way?

    **Integration:**
    - Do the changes integrate cleanly?
    - Are there conflicts or overlaps?
    - Does the combined result make sense?

    ### Step 4: Run Verification

    ```bash
    # Run full test suite
    [project test command]

    # Run linters
    [project lint command]

    # Run type checker if applicable
    [project typecheck command]
    ```

    ### Step 5: Deliver Verdict

    **If all issues pass review:**

    Report:
    ```
    ## Phase Review: APPROVED

    All [N] issues pass review:
    - #70: ✓ Correct, clean, follows patterns
    - #71: ✓ Correct, clean, follows patterns
    - #72: ✓ Correct, clean, follows patterns

    Cross-issue review: ✓ Consistent patterns, clean integration

    Tests: ✓ All passing
    Linting: ✓ Clean

    Ready for orchestrator to commit.
    ```

    **If issues need fixes:**

    Report:
    ```
    ## Phase Review: CHANGES REQUESTED

    ### Issues Needing Fixes

    **#70: Category breakdown**
    - [ ] Issue: [describe problem]
    - [ ] Fix: [describe what needs to change]

    **#71: Collapsible section**
    - ✓ Approved

    **#72: Remove month selector**
    - [ ] Issue: [describe problem]
    - [ ] Fix: [describe what needs to change]

    ### Cross-Issue Concerns
    - [Any consistency or integration issues]

    Implementation agents should fix the listed issues, then request re-review.
    ```

    ## Important Notes

    - **You are the quality gate** - Don't approve changes that don't meet standards
    - **Be specific** - If requesting fixes, explain exactly what's wrong and how to fix it
    - **Fresh eyes** - You haven't implemented this, so you can spot issues the implementers missed
    - **Consider the whole** - Individual changes might be fine but not work well together
```

## Key Points

- **Fresh context** - Reviewer has full context budget for review, no implementation fatigue
- **See the whole phase** - Can catch cross-issue inconsistencies
- **Quality gate** - Must approve before orchestrator commits
- **Specific feedback** - If fixes needed, be clear about what and why
- **Run verification** - Don't just read code, run tests and linters
