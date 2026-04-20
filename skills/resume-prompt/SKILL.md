---
name: resume-prompt
description: Generate a copy-pasteable prompt to resume mid-task work in a fresh Claude session. Captures session summary, git state, needs-validation, blockers, skipped/mis-tracked work, learnings, and suggested next steps. Accepts optional free-text trailing argument for explicit user direction.
user_invocable: true
---

# Resume Prompt

Produce a copy-pasteable prompt that lets a fresh Claude session resume in-flight work with full context. Intended for **mid-task session resets** — context pressure, cache window expiring, switching machines — not for clean handoffs between unrelated tasks.

## When to Use

| Situation | Use this skill? |
|-----------|-----------------|
| Mid-task, about to `/clear` or close terminal | Yes |
| Context window nearing full | Yes |
| Switching machines with work in progress | Yes |
| Project completion / PR handoff | No — use `/update-docs` and PR description |
| Scheduled session start on a new day | No — use `/start-session` |
| Pure conversational/exploratory session with no code changes | No — nothing to resume |

## Invocation

```
/resume-prompt [optional free-text focus for next session]
```

The skill accepts an optional trailing argument. When present, the argument is the user's explicit direction for what the next session should focus on — it takes precedence over the skill's auto-derived Suggested Next Steps.

Examples:
- `/resume-prompt` — no direction, skill derives everything from conversation + git state
- `/resume-prompt focus on the failing migration test, ignore the UI work` — user steers the next session
- `/resume-prompt first validate the new auth flow end-to-end, then clean up the TODO comments` — ordered direction

The argument is surfaced as a dedicated **User Direction** section at the top of the output (right after the preamble, before Session Summary). Its presence does not suppress the other sections. The receiving agent is instructed to treat User Direction as the primary steering signal.

## Inputs

The skill draws from three sources:

1. **User's trailing argument** (optional) — explicit direction; highest priority. See Invocation above.
2. **Current conversation** — the authoritative source for intent, skipped steps, blockers, learnings. No tool call needed.
3. **Git state** — branch, worktree (if applicable), uncommitted files, last commit.

**Preferred (workflow MCP):**

```
mcp__workflow__git_state()
```

**Fallback (bash):**

```bash
git branch --show-current
git worktree list
git status --short
git log -1 --format='%h %s'
```

If the current checkout is inside a worktree (not the primary clone), note both the branch and the worktree path — the next session may need to `cd` into the same worktree to resume.

**Out of scope for inputs:** GitHub issues/PRs, milestones, CI state, remote branches. If the user is mid-PR-review or mid-milestone, those systems are already the source of truth — reference them by number instead of duplicating.

## Output Format

The skill outputs a single fenced markdown block to chat. No file is written. The user copies it manually.

### Structure

```
## Instruction Preamble
You are resuming work from a previous Claude Code session. Below is the
state at the point of reset. Before acting, confirm the branch (and
worktree, if listed) matches and run `git status` to verify the working
tree. If a "User Direction" section is present, treat it as the primary
steering signal — work toward it first, and only fall back to "Suggested
Next Steps" once the user's direction is satisfied or blocked. If no
User Direction is present, ask which of the Suggested Next Steps to
tackle, or wait for new direction.

## User Direction
<The user's trailing argument to /resume-prompt, optionally amended with
 session context. Preserve the user's intent; you may expand shorthand
 with concrete references (test paths, file names), disambiguate vague
 referents, and append tightly related context the user clearly had in
 mind (error messages, issue numbers). Do NOT replace their goals,
 reorder their priorities, or drop items they mentioned. Keep their
 phrasing recognizable — "clarified" not "rewritten".>
<If no argument was provided: omit section entirely>

## Session Summary
<1-3 sentences: what we set out to do and what got done>

## Current State
- **Branch:** <name>
- **Worktree:** <path, only when not the primary clone; omit line otherwise>
- **Uncommitted changes:** <file list from git status --short, or "none">
- **Last commit:** <hash + title>

## Needs Validation
<Bugs fixed or features built that haven't been tested in-situ yet. One
 bullet per item. For each item, state how to validate concretely — the
 exact action to confirm it works. Examples:
 "run pytest tests/auth/test_login.py::test_missing_password",
 "open /ingredients/42 and submit with empty name",
 "curl POST /api/v1/sync with stale ETag".
 Avoid vague phrasings like "test the login flow" — name the test, URL,
 or UI path.>
<If empty: omit section entirely>

## Blockers & Deeper Issues
<Problems encountered that weren't fully resolved — root causes not yet
 understood, tests that revealed unexpected behavior, dependencies that
 failed. One bullet per item.>
<If empty: omit section entirely>

## Skipped / Incomplete Work
<ALWAYS INCLUDED. Two categories:
 (a) Work that was supposed to happen but didn't — skill steps
     abbreviated, issue acceptance criteria unmet, user requests
     deferred or half-addressed.
 (b) Work that was identified but not properly tracked — issues that
     should exist but weren't created, items dumped into generic
     Backlog when they belong in the active milestone, items in the
     wrong milestone, scope done outside the active issue/PR.
 One bullet per item, marked (a) or (b).>
<If empty: write "None identified — but the next session should verify
 against the original request.">

## Key Learnings
<Non-obvious things discovered — gotchas, wrong assumptions corrected,
 decisions made with rationale. Skip anything already in GOTCHAS.md or
 code comments.>
<If empty: omit section entirely>

## Suggested Next Steps
<Ordered list. Lead with whatever most needs human validation or is
 most load-bearing for continued work. If User Direction was provided,
 this section is auxiliary — items to pick up AFTER the user's
 direction, or things they may have overlooked.>
```

### Section Rules

| Section | Required | Omit when empty? |
|---------|----------|------------------|
| Instruction Preamble | Yes | Never |
| User Direction | Optional | Yes (omit when no argument passed) |
| Session Summary | Yes | Never |
| Current State | Yes | Never (even on clean tree — show "none") |
| Needs Validation | Optional | Yes |
| Blockers & Deeper Issues | Optional | Yes |
| Skipped / Incomplete Work | Yes | Never (write "None identified" when empty) |
| Key Learnings | Optional | Yes |
| Suggested Next Steps | Yes | Never |

The asymmetry around "Skipped / Incomplete Work" is deliberate: the absence of skipped work is load-bearing information. An omitted section could mean "none" or "forgot to check" — explicit "None identified" distinguishes them.

## Skipped-Work Detection

This section is the one most likely to be underfilled without explicit prompting. Scan the conversation for two categories of drift:

**Category (a) — Work that was supposed to happen but didn't:**

1. **Commands/skills whose steps were abbreviated.** Did any skill's checklist items get skipped? Did a command stop partway?
2. **Issue acceptance criteria not verified.** If an issue was worked on, were each of its acceptance criteria demonstrably met in the code?
3. **User requests deferred or half-addressed.** Did the user ask for something that got partially done, or got accepted verbally but not implemented?
4. **Test coverage gaps.** Was new code added without corresponding tests (per the project's test-first rule)?

**Category (b) — Work that was identified but not properly tracked:**

5. **Bugs or ideas surfaced without an issue.** Did the conversation turn up a problem or improvement that no one filed an issue for?
6. **Items parked in the wrong bucket.** Was something dumped into generic Backlog when it belongs in the active milestone, or put into a different milestone than the one in scope?
7. **Scope creep without tracking.** Did the session implement work that wasn't part of the active issue/PR, without a corresponding issue existing for it?

Each item should name *what* was skipped or mis-tracked and *why* (if known — context ran out, blocked on dependency, forgotten, unclear where it belongs).

## Worked Example

Two minimal examples — not realistic sessions, deliberately short to calibrate voice and omission rules.

### Variant 1: No trailing argument

Invoked as `/resume-prompt`. User Direction is omitted.

```
## Instruction Preamble
You are resuming work from a previous Claude Code session. Below is the
state at the point of reset. Before acting, confirm the branch matches
and run git status to verify the working tree. If no User Direction
is present, ask which of the Suggested Next Steps to tackle, or wait
for new direction.

## Session Summary
Refactored ingredient-edit form to use controlled inputs. Tests pass
locally; staging not yet deployed.

## Current State
- **Branch:** feature/ingredient-edit-refactor
- **Uncommitted changes:** none
- **Last commit:** a3f8921 (refactor) #142: controlled inputs for ingredient edit

## Needs Validation
- Open /ingredients/new on staging and submit with a comma-separated
  quantity (e.g. "1,5") — verify the decimal isn't silently dropped

## Skipped / Incomplete Work
- (a) Issue #142 acceptance criterion "update Storybook snapshot" not done — Storybook isn't installed in this worktree yet

## Suggested Next Steps
1. Deploy to staging and run the validation above
2. Install Storybook locally and update the snapshot (covers the skipped criterion)
3. Open PR if staging validation passes
```

### Variant 2: With trailing argument

Invoked as `/resume-prompt focus on the Storybook snapshot before deploying`. User Direction is populated.

```
## Instruction Preamble
You are resuming work from a previous Claude Code session. Treat the
User Direction section below as your primary steering signal — work
toward it first, and only fall back to Suggested Next Steps once the
direction is satisfied or blocked.

## User Direction
Focus on the Storybook snapshot before deploying. (Context from session:
Storybook not yet installed in this worktree; update needed for issue
#142 acceptance criteria.)

## Session Summary
Refactored ingredient-edit form to use controlled inputs. Tests pass
locally; staging not yet deployed.

## Current State
- **Branch:** feature/ingredient-edit-refactor
- **Uncommitted changes:** none
- **Last commit:** a3f8921 (refactor) #142: controlled inputs for ingredient edit

## Skipped / Incomplete Work
- (a) Issue #142 acceptance criterion "update Storybook snapshot" not done — addressed by User Direction

## Suggested Next Steps
1. After Storybook snapshot update, deploy to staging
2. Run the decimal-separator validation from the previous session
3. Open PR
```

## Checklist

Follow this checklist in order:

- [ ] Capture the user's trailing argument (if any) — preserve intent but expand shorthand, disambiguate vague referents, and append tightly related session context; do not replace, reorder, or drop user items
- [ ] Gather git state via `mcp__workflow__git_state()` (preferred) or the bash fallbacks in Inputs — include worktree path if applicable
- [ ] Draft Session Summary (1-3 sentences)
- [ ] Scan conversation for Skipped/Incomplete work — run through all seven detection prompts above, split into (a) untracked work and (b) mis-tracked work
- [ ] Identify Needs Validation items — each with a concrete how-to-validate action
- [ ] Identify Blockers & Deeper Issues
- [ ] Extract Key Learnings (skip anything already in GOTCHAS.md)
- [ ] Order Suggested Next Steps by load-bearingness
- [ ] Assemble fenced markdown block matching the Structure above
- [ ] Include Instruction Preamble verbatim
- [ ] Run the Secrets Scan (see Guardrails)
- [ ] Output to chat only — do NOT write a file

## Guardrails

- **Secrets scan:** Before outputting, check the prompt for secrets (API keys, tokens, passwords) that may have surfaced in the conversation. Redact with `<redacted>` and note the redaction inside the Preamble.
- **Length cap:** If total output exceeds ~200 lines, compress — prefer brevity over completeness. Resume prompts are consumed under context pressure on the receiving side too.
- **No file writes:** The skill never writes to disk. Persistence is the user's choice.
- **Always include Skipped / Incomplete Work:** Even when empty. Write "None identified — but the next session should verify against the original request." An omitted section could mean forgotten; an explicit "None identified" means checked.
