# Start Milestone — Completion, PR Handoff & Manual Task Loop

Loaded by `/start-milestone` after the last automated phase is committed, or on a re-run where all automated issues are already `code-complete`.

## Completion & PR Handoff

### Final State Query

```
mcp__workflow__gh_milestone_issues(milestone=5, state="all")
```

### Happy Path (All non-manual issues `code-complete`)

If no `manual` issues remain open:
```
All 12 issues complete. Ready for PR. Run /create-pr #5 when you're ready.
```

If `manual` issues are still open:
```
All automated issues are complete (10/12). Run /create-pr #5 when ready.

Note: The following manual issues are still open:
- #46: Run migration and validate data
- #48: Review enriched dataset

Handle these before or after PR creation — /merge-pr will block until all are closed.
```

**Do NOT auto-invoke `/create-pr`.** Inform the user that all issues are complete and they can run `/create-pr #N` (with the milestone number) manually when ready.

### Partial Failure (Some `blocked-failed`)

```
## Milestone Summary

Complete: 10 issues
Failed: 2 issues
  - #15: Add retry endpoint (failed: tests not passing after retry)
  - #18: Widget component (failed: spec review rejected twice)

### Suggestions
1. Retry failed issues: `/start-milestone 5 --retry-failed`
2. Skip failures and create PR anyway: `/create-pr #5`
3. Fix manually, then resume: `/start-milestone 5`
```

## Manual Task Loop

After all automated phases complete, check for open `manual` issues:

```
mcp__workflow__gh_milestone_issues(milestone=5, state="open")
# Filter for issues with "manual" label
```

**If no manual issues remain:** proceed to standard completion (suggest `/create-pr #N`).

**If manual issues exist:** enter interactive loop in the main session (NOT a subagent).

### Per Manual Issue

1. Present the issue title and `## Manual Task Prompt` section from the issue body
2. Ask the user via `AskUserQuestion`:
   - **"Work on this now"** — Stay in terminal, read full issue, assist interactively. When done, ask if issue should be closed with `code-complete` label.
   - **"Skip for later"** — Move to next manual issue
   - **"Already done"** — Close issue with `code-complete` label via `gh_bulk_issues(action="close", issues=[N], label="code-complete")`

### After Loop

Print summary and suggest `/create-pr #N` (with actual milestone number). Always include a reminder about remaining manual issues:

```
All automated issues are complete. Run /create-pr #5 when ready.

Note: The following manual issues are still open:
- #46: Run migration and validate data
- #48: Review enriched dataset

Handle these before or after PR creation — /merge-pr will block until all are closed.
```

If all manual issues were handled, omit the note.

### Multi-Session Resume

When `/start-milestone` is re-run and all automated issues are `code-complete`:
- Skip straight to the manual task loop
- Issue bodies (Manual Task Prompt) are the source of truth — no session state needed
