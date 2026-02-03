# Recovery Subagent Prompt Template

Use this template when dispatching a subagent to continue work on an in-progress issue after a crash or interruption.

**IMPORTANT:** Like implementation agents, recovery agents do NOT commit or close issues. They complete the work, verify tests pass, and mark `ready-for-review`.

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

    **Uncommitted changes:**
    [List of files from git status/diff, or "None"]

    **Current test status:**
    [Test output summary, or "Unknown"]

    ## Before You Begin

    **Read CLAUDE.md first** for project commands and conventions.

    ### Assess Current State

    Before continuing, you must understand what was done:

    1. **Check current changes:**
       ```bash
       git status
       git diff
       ```

    2. **Run tests:**
       ```bash
       # Use project-specific test command from CLAUDE.md
       ```

    3. **Review acceptance criteria:**
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

    - Run all tests (full suite)
    - Check that all acceptance criteria are met
    - Verify no regressions
    - Run linters/formatters

    ### Step 3: Self-Review

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

    Fix any issues found.

    ### Step 4: Mark Ready for Review

    After self-review passes and all tests pass:
    ```
    mcp__workflow__gh_update_issue(issue=N, remove_labels=["in-progress"], add_labels=["ready-for-review"])
    ```

    Fallback (if MCP unavailable):
    ```bash
    gh issue edit N --remove-label "in-progress" --add-label "ready-for-review"
    ```

    ### ⚠️ DO NOT Commit or Close

    **You must NOT:**
    - Run `git commit`
    - Close the issue
    - Mark as `code-complete`

    The orchestrator will commit your changes after the phase review passes.

    ## Report Format

    When done, report:
    - Assessment of prior work
    - What you implemented/completed
    - What you tested and test results
    - Files changed (list them for orchestrator to commit)
    - Any issues or concerns

    ## If Blocked

    If you find the work cannot be continued:
    - Report what's blocking progress
    - Do NOT mark as ready-for-review
    - Leave as in-progress for manual intervention

    ## Label Flow Reference

    ```
    Your responsibility:
      in-progress → ready-for-review
      [continue]    [done, awaiting review & commit]

    Orchestrator handles:
      ready-for-review → code-complete (closed)
      [after commit]
    ```
```

## Checklist

**CRITICAL: Assessment MUST happen before any implementation work.**

### Assessment Phase (do this FIRST)
- [ ] Run `git status` and `git diff` to see current changes
- [ ] Run tests to see what's working
- [ ] Review acceptance criteria - which are met? which remain?
- [ ] **Report assessment to orchestrator before proceeding**
- [ ] Determine: Can I continue, or do I need guidance?

### Continue Implementation (only after assessment)
- [ ] Pick up where previous work left off
- [ ] Follow TDD for remaining work
- [ ] Run full test suite
- [ ] Check all acceptance criteria met
- [ ] Run linters/formatters

### Self-Review
- [ ] All acceptance criteria met?
- [ ] Code follows CLAUDE.md rules?
- [ ] Issues found during review fixed?

### Completion
- [ ] Mark `ready-for-review` (swap labels)
- [ ] Report: assessment, what completed, files changed, test results

### ⚠️ CRITICAL CONSTRAINTS
- [ ] **I have NOT run `git commit`**
- [ ] **I have NOT closed the issue**
- [ ] **If blocked, I left as `in-progress`** (not ready-for-review)

## Key Points

- **DO NOT COMMIT** - Orchestrator commits after phase review
- **DO NOT CLOSE ISSUES** - Orchestrator closes after committing
- **Assess before acting** - Understand what was done before continuing
- **Check test status** - Tests tell you what's working
- **Report assessment first** - Don't assume you can continue
- **Report files changed** - Orchestrator needs this list to commit correctly
- **Leave in-progress if blocked** - Don't mark ready if work can't complete
