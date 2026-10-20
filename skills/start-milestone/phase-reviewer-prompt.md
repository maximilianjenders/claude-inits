# Phase Review — Agent Instructions

You are the review agent for one phase of a milestone run by `/start-milestone`. The orchestrator dispatched you with a short prompt pointing here plus these values:

- **Phase** number and **milestone** title, **Branch**
- **Working directory** (the worktree path)
- **Design doc** path or "None"
- **Stat summary** of the staged changes (`git diff --cached --stat`)
- **Issues in this phase**, each with title and a brief acceptance-criteria summary
- **Agent reports** per issue: what was built, files changed, self-review findings

The orchestrator does not read this file — everything you need to act on is here.

**These changes are UNCOMMITTED and STAGED.** The orchestrator ran `git add -A` before dispatching you and commits the staged state after you approve. Do not stage, unstage, modify, or commit anything.

## Get the Diff

Always use `--cached` — a bare `git diff` misses the new files the implementation agents created:

```bash
git -C <worktree> diff --cached --stat
git -C <worktree> diff --cached
```

Compare the totals line of your `--stat` (e.g. `5 files changed, 621 insertions(+)`) with the stat summary in your prompt. If they differ, stop and report the mismatch instead of reviewing — the orchestrator would otherwise commit something you did not see.

**Large diff (stat shows > 1000 changed lines):** don't pull the full diff at once. Use `git -C <worktree> diff --cached -- <file>` per file, in priority order from the stat — high-change files and files central to the acceptance criteria first.

Only read full files when the diff is unclear or you need surrounding context for a specific concern.

## Your Task

Use the `superpowers:requesting-code-review` skill to review these changes.

Also invoke the `/simplify` skill for additional code reuse, quality, and efficiency checks. Run only its review phases (Phases 1-2) — do NOT auto-fix. Include any findings in your review report alongside the code review findings.

Review against:
1. **Scope:** The acceptance criteria for each issue you were given — check each one individually against the diff. The orchestrator batch-commits the phase on your approval, so this per-issue check is what makes the batch commit acceptable (see `~/.claude/shared/plan-execution.md`).
2. **Standards:** CLAUDE.md project coding standards
3. **Design doc:** Read it to verify design compliance (if a path was given)

Do NOT run tests or linters — pre-commit hooks handle both at commit time.

### Phase-Specific Review Focus

**Cross-Issue Consistency**
- Do all issues use consistent patterns?
- Are naming conventions consistent across the changes?
- Are similar problems solved the same way?

**Integration**
- Do the changes from different issues work together?
- Are there conflicts or overlaps between issues?
- Does the combined result make sense as a whole?

## Output Format

Start the report with the `--stat` totals line you reviewed. Then:

**If APPROVED:**
```
Reviewed: 5 files changed, 621 insertions(+)

## Phase Review: APPROVED

All issues pass review. Ready for orchestrator to commit.

Summary:
- #70: [brief note]
- #71: [brief note]
- #72: [brief note]

Cross-issue consistency: OK
```

**If CHANGES REQUESTED:**
```
Reviewed: 5 files changed, 621 insertions(+)

## Phase Review: CHANGES REQUESTED

### Issues Needing Fixes

**#70: [title]**
- [ ] [specific issue and fix needed]

**#71: [title]**
- Approved

### Cross-Issue Concerns
- [any consistency or integration issues]

Fix agents should address the listed issues, then request re-review.
```

**On re-review** (after fixes, the orchestrator re-stages and sends a new stat): pull the staged diff again, confirm the new totals, and check that each requested fix is in place.
