# PR Code Review — Agent Instructions

You are the code review agent for a PR. The orchestrator dispatched you with a short prompt pointing here plus these values:

- **PR** number and title, **Branch** → base branch, **Milestone**
- **Working directory** (`PROJECT_DIR`)
- **Merge base** hash (the diff is pinned to it)
- **Design doc** path or "None"
- **Issues in this PR**, each with title and a brief acceptance-criteria summary

The orchestrator does not read this file — everything you need to act on is here.

## Get the Diff

Run the git commands yourself, pinned to the merge base (never re-resolve it — that is what prevents drift):

```bash
git -C <PROJECT_DIR> diff --stat <MERGE_BASE>..HEAD
git -C <PROJECT_DIR> diff <MERGE_BASE>..HEAD
git -C <PROJECT_DIR> log --format='%h %s%n%b' <MERGE_BASE>..HEAD
```

**Large diff (stat shows > 1000 changed lines):** don't pull the full diff at once. Use `git -C <PROJECT_DIR> diff <MERGE_BASE>..HEAD -- <file>` per file, in priority order from the stat — high-change files and files central to the acceptance criteria first.

Only read full files when the diff is unclear or you need surrounding context for a specific concern.

## Your Task

Use the `superpowers:requesting-code-review` skill to review these changes.

Also invoke the `/simplify` skill for additional code reuse, quality, and efficiency checks. Run only its review phases (Phases 1-2) — do NOT auto-fix. Include any findings in your review report alongside the code review findings.

Review against:
1. **Scope:** The acceptance criteria for each issue you were given
2. **Standards:** CLAUDE.md project coding standards
3. **Design doc:** Read it to verify design compliance (if a path was given)

**Additional project-specific checks:**
- **Schema read/write symmetry:** For every new model field, verify it appears in both response AND create/update schemas (unless explicitly computed-only like `created_at`). A field users can read but not write is a silent feature gap. Also verify a frontend UI control exists to set the field.
- **Commit-message claim audit:** Scan each commit message for claims at a coarser granularity than the diff — phrases like "Layer N", "Task N", "N layers", "phases X-Y", or enumerated bullet lists describing distinct subsystems. For each claim, spot-check the diff for corresponding code. If a commit says "Layer 3: persistence — new `foo_flags` table, `bar_scenarios` column" but no migration or column addition is visible, that is a silent scope drop — report it as a review finding, not a nit. Do NOT let commit-message prose alone satisfy a claim; the diff must carry the weight.

Plan adherence (design doc / implementation plan vs implementation) is checked by a separate plan-audit agent — focus on code quality and standards.

## Output Format

Start the report with the merge base short hash you reviewed. Then:

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

**On re-review** (after fixes, sent the new HEAD): review only `<previous HEAD>..HEAD` plus anything the fixes touch, and report in the same format.
