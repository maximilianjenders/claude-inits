# PR Reviewer Prompt Template

Use this template when dispatching a review agent to review all changes in a PR before deploying.

**Key difference from phase review:** PR review happens on COMMITTED changes with an existing PR. The orchestrator pre-computes diffs using exact git hashes to avoid drift.

## Dispatch Pattern

```
Task tool (general-purpose):
  description: "Review PR #N changes"
  prompt: |
    Review PR #[PR_NUMBER] ([branch_name]) for the [project_name] project.

    ## PR Context

    **PR:** #[PR_NUMBER] — [PR title]
    **Branch:** `[branch_name]` → `[base_branch]`
    **Milestone:** [milestone_title]
    **Working directory:** [path]
    **Design doc:** [design_doc_path or "None"]

    **Issues in this PR:**
    - #12: [title] - [brief acceptance criteria summary]
    - #13: [title] - [brief acceptance criteria summary]
    - #14: [title] - [brief acceptance criteria summary]

    ## Changes to Review (pre-computed)

    Diff computed at merge base [MERGE_BASE_SHORT_HASH].

    ### Diff Summary
    [paste git diff --stat $MERGE_BASE..HEAD output here]

    ### Full Diff
    [paste git diff $MERGE_BASE..HEAD output here]

    ## Your Task

    Use the `superpowers:requesting-code-review` skill to review these changes.

    **Use the pre-computed diff above.** Only read individual files if the diff is unclear or you need surrounding context for a specific concern.

    Provide this context to the review:
    1. **Scope:** The acceptance criteria for each issue listed above
    2. **Standards:** Read CLAUDE.md for project coding standards
    3. **Design doc:** Read the design doc at [design_doc_path] to verify design compliance (if provided)

    ## Output Format

    After running the code review skill, report:

    **If APPROVED:**
    ```
    ## PR Review: APPROVED

    All changes pass review. Ready for deployment and E2E testing.

    Summary:
    - #12: [brief note]
    - #13: [brief note]
    ```

    **If CHANGES REQUESTED:**
    ```
    ## PR Review: CHANGES REQUESTED

    ### Findings

    1. **[file:line] — [finding title]**
       - Issue: [description]
       - Suggested fix: [specific fix]

    2. **[file:line] — [finding title]**
       - Issue: [description]
       - Suggested fix: [specific fix]
    ```
```

## How the Orchestrator Pre-computes Diffs

Before dispatching the reviewer, the orchestrator should:

**Preferred: MCP**
```
# Pin the diff to merge-base and get diffs in one call each
mcp__workflow__git_diff(base="master", mode="stat")   → { merge_base, merge_base_short, diff }
mcp__workflow__git_diff(base="master", mode="full")    → { merge_base, merge_base_short, diff }
```

**Fallback: Bash**
```bash
MERGE_BASE=$(git merge-base master HEAD)
git diff --stat $MERGE_BASE..HEAD
git diff $MERGE_BASE..HEAD
```

Use `merge_base_short` (first 7 chars) in the prompt for traceability.

## Checklist

**Follow this checklist for every PR review dispatch.**

### Preparation (orchestrator does this BEFORE dispatching reviewer)
- [ ] Get stat diff: `mcp__workflow__git_diff(mode="stat")` → captures merge_base_short
- [ ] Get full diff: `mcp__workflow__git_diff(mode="full")`
- [ ] Gather linked issue titles and acceptance criteria from milestone
- [ ] Get design doc path from milestone description (if any)

### Dispatch
- [ ] Fill in the template above with pre-computed data
- [ ] Dispatch reviewer agent with `Task` tool (general-purpose)

## Key Points

- **Pre-computed diffs** — orchestrator pins to merge-base hash, reviewer doesn't run git commands
- **Issue context included** — reviewer sees acceptance criteria inline, doesn't need to fetch issues
- **Design doc access** — reviewer receives path, reads only if provided
- **Fresh agent** — no implementation bias, dedicated context for review
- **Quality gate** — must approve before deploying to dev
