# /resume-prompt Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-invocable `/resume-prompt` skill that emits a copy-pasteable prompt capturing session state (summary, git state, needs-validation, blockers, skipped work, learnings, next steps, optional user direction) for resuming mid-task work in a fresh Claude session.

**Architecture:** Single markdown file at `skills/resume-prompt/SKILL.md` (~175 lines) containing frontmatter + instructions Claude follows when the command is invoked. One-line index entry added to `memory/MEMORY.md`. No supporting templates, no code, no persistent test script — validation is structural (bash grep checks during implementation) plus a manual smoke invocation.

**Tech Stack:** Markdown, YAML frontmatter. Bash for inline validation during implementation.

**Spec:** `docs/superpowers/specs/2026-04-20-resume-prompt-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `skills/resume-prompt/SKILL.md` | Create | The skill body — all instructions Claude follows when `/resume-prompt` is invoked |
| `/Users/max/.claude/projects/-Users-max-Gits-claude-inits/memory/MEMORY.md` | Modify | Add `resume-prompt` to the Key skills list |

No other files are created or modified.

## Fencing Convention in This Plan

Several tasks below write markdown content that itself contains triple-backtick code fences. To show such content in this plan unambiguously, the plan uses **four-backtick outer fences** (`` ```` ``) when the content to write contains triple-backticks. The SKILL.md file itself always uses three-backticks — the four-backtick fences here are a plan-formatting device only. When you execute a task, use the Edit tool's string verbatim as it appears between the four-backtick delimiters.

---

## Task 1: Scaffold SKILL.md with frontmatter and section headings

**Files:**
- Create: `skills/resume-prompt/SKILL.md`

- [ ] **Step 1: Create directory**

Run:

```bash
mkdir -p /Users/max/Gits/claude-inits/skills/resume-prompt
```

- [ ] **Step 2: Write the scaffold file**

Use the Write tool to create `skills/resume-prompt/SKILL.md` with exactly this content:

````markdown
---
name: resume-prompt
description: Generate a copy-pasteable prompt to resume mid-task work in a fresh Claude session. Captures session summary, git state, needs-validation, blockers, skipped/mis-tracked work, learnings, and suggested next steps. Accepts optional free-text trailing argument for explicit user direction.
user_invocable: true
---

# Resume Prompt

<!-- Purpose + When to Use: filled in Task 2 -->

## Invocation

<!-- filled in Task 2 -->

## Inputs

<!-- filled in Task 3 -->

## Output Format

<!-- filled in Task 4 -->

## Skipped-Work Detection

<!-- filled in Task 5 -->

## Worked Example

<!-- filled in Task 6 -->

## Checklist

<!-- filled in Task 5 -->

## Guardrails

<!-- filled in Task 5 -->
````

- [ ] **Step 3: Verify frontmatter and headings**

Run:

```bash
grep -c "^## " /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: `7` (seven `## ` section headings).

Run:

```bash
head -5 /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: frontmatter with `name: resume-prompt`, `description:` line, `user_invocable: true`, closing `---`.

- [ ] **Step 4: No commit yet — batched at end of Task 7.**

---

## Task 2: Add Purpose, When to Use, and Invocation sections

**Files:**
- Modify: `skills/resume-prompt/SKILL.md`

- [ ] **Step 1: Replace the post-title placeholder**

Use Edit to replace the single line `<!-- Purpose + When to Use: filled in Task 2 -->` in `skills/resume-prompt/SKILL.md` with:

````markdown
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
````

- [ ] **Step 2: Replace the Invocation placeholder**

Use Edit to replace the line `<!-- filled in Task 2 -->` under `## Invocation` with:

````markdown
```
/resume-prompt [optional free-text focus for next session]
```

The skill accepts an optional trailing argument. When present, the argument is the user's explicit direction for what the next session should focus on — it takes precedence over the skill's auto-derived Suggested Next Steps.

Examples:
- `/resume-prompt` — no direction, skill derives everything from conversation + git state
- `/resume-prompt focus on the failing migration test, ignore the UI work` — user steers the next session
- `/resume-prompt first validate the new auth flow end-to-end, then clean up the TODO comments` — ordered direction

The argument is surfaced as a dedicated **User Direction** section at the top of the output (right after the preamble, before Session Summary). Its presence does not suppress the other sections. The receiving agent is instructed to treat User Direction as the primary steering signal.
````

- [ ] **Step 3: Verify**

Run:

```bash
grep -c "^## When to Use$" /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: `1`.

Run:

```bash
grep "resume-prompt \[optional" /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: a line showing the invocation syntax.

- [ ] **Step 4: No commit yet.**

---

## Task 3: Add Inputs section

**Files:**
- Modify: `skills/resume-prompt/SKILL.md`

- [ ] **Step 1: Replace the Inputs placeholder**

Use Edit to replace the line `<!-- filled in Task 3 -->` under `## Inputs` with:

````markdown
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
````

- [ ] **Step 2: Verify**

Run:

```bash
grep "mcp__workflow__git_state" /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: one match.

Run:

```bash
grep "git worktree list" /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: one match.

- [ ] **Step 3: No commit yet.**

---

## Task 4: Add Output Format section

**Files:**
- Modify: `skills/resume-prompt/SKILL.md`

- [ ] **Step 1: Replace the Output Format placeholder**

Use Edit to replace the line `<!-- filled in Task 4 -->` under `## Output Format` with:

````markdown
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
````

**Note on the inner code fence:** the Structure template above is wrapped in a single set of three-backtick fences inside the content-to-write. The outer four-backtick fences in this plan exist only to show that content verbatim. The actual SKILL.md file should end up with a three-backtick fence around the Structure template.

- [ ] **Step 2: Verify all 9 section rows appear in the Section Rules table**

Run:

```bash
grep -E "^\| (Instruction Preamble|User Direction|Session Summary|Current State|Needs Validation|Blockers|Skipped|Key Learnings|Suggested Next Steps)" /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: 9 lines of output.

Run:

```bash
grep -c "^### Structure$" /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: `1`.

- [ ] **Step 3: No commit yet.**

---

## Task 5: Add Skipped-Work Detection, Checklist, and Guardrails

**Files:**
- Modify: `skills/resume-prompt/SKILL.md` (three placeholder replacements)

- [ ] **Step 1: Replace the Skipped-Work Detection placeholder**

Use Edit to replace the line `<!-- filled in Task 5 -->` under `## Skipped-Work Detection` with:

````markdown
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
````

The Edit's `old_string` must target the `<!-- filled in Task 5 -->` line that sits directly under `## Skipped-Work Detection` specifically. Since the same placeholder text appears three times (under Skipped-Work Detection, Checklist, and Guardrails), include enough surrounding context in `old_string` to make it unique — e.g. include the preceding `## Skipped-Work Detection` heading line.

- [ ] **Step 2: Replace the Checklist placeholder**

Use Edit to replace the line `<!-- filled in Task 5 -->` under `## Checklist`. Again, include the preceding heading in `old_string` for uniqueness.

Replacement content:

````markdown
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
````

- [ ] **Step 3: Replace the Guardrails placeholder**

Use Edit to replace the remaining `<!-- filled in Task 5 -->` line under `## Guardrails` with:

````markdown
- **Secrets scan:** Before outputting, check the prompt for secrets (API keys, tokens, passwords) that may have surfaced in the conversation. Redact with `<redacted>` and note the redaction inside the Preamble.
- **Length cap:** If total output exceeds ~200 lines, compress — prefer brevity over completeness. Resume prompts are consumed under context pressure on the receiving side too.
- **No file writes:** The skill never writes to disk. Persistence is the user's choice.
- **Always include Skipped / Incomplete Work:** Even when empty. Write "None identified — but the next session should verify against the original request." An omitted section could mean forgotten; an explicit "None identified" means checked.
````

- [ ] **Step 4: Verify**

Run:

```bash
grep -c "^- \[ \] " /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: `12` (the twelve checklist items).

Run:

```bash
grep -c "^\*\*Category" /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: `2` (two category headers in Skipped-Work Detection).

Run:

```bash
grep "Secrets scan" /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: one match.

- [ ] **Step 5: No commit yet.**

---

## Task 6: Add Worked Example (two variants)

**Files:**
- Modify: `skills/resume-prompt/SKILL.md`

- [ ] **Step 1: Replace the Worked Example placeholder**

Use Edit to replace the line `<!-- filled in Task 6 -->` under `## Worked Example` with the following. Acceptance criterion #6 requires both a no-argument variant and a User-Direction variant.

````markdown
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
````

- [ ] **Step 2: Verify both variants present**

Run:

```bash
grep -c "^### Variant" /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: `2`.

Run:

```bash
grep -c "^## User Direction$" /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: `2` (once in the Structure template from Task 4, once in Variant 2). If the count is `1`, Variant 2's User Direction heading is missing — re-check the Edit.

- [ ] **Step 3: Final structural sanity check**

Run:

```bash
wc -l /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: between 150 and 230 lines (spec targets ~175).

Run:

```bash
grep -c "^<!--" /Users/max/Gits/claude-inits/skills/resume-prompt/SKILL.md
```

Expected: `0` (no placeholders left).

- [ ] **Step 4: No commit yet.**

---

## Task 7: Update MEMORY.md, smoke test, commit

**Files:**
- Modify: `/Users/max/.claude/projects/-Users-max-Gits-claude-inits/memory/MEMORY.md`

- [ ] **Step 1: Read current MEMORY.md to locate the "Key skills" line**

Run:

```bash
grep -n "Key skills" /Users/max/.claude/projects/-Users-max-Gits-claude-inits/memory/MEMORY.md
```

Expected: one matching line. Current content:

```
- Key skills: `start-milestone`, `start-issue`, `create-pr`, `merge-pr`
```

If the line differs from the above (e.g. already contains `resume-prompt` or has been reorganized), adapt the Edit in Step 2 to match the actual current line.

- [ ] **Step 2: Update the Key skills line**

Use Edit with:

- `old_string`: `` - Key skills: `start-milestone`, `start-issue`, `create-pr`, `merge-pr` ``
- `new_string`: `` - Key skills: `start-milestone`, `start-issue`, `create-pr`, `merge-pr`, `resume-prompt` ``

- [ ] **Step 3: Verify**

Run:

```bash
grep "resume-prompt" /Users/max/.claude/projects/-Users-max-Gits-claude-inits/memory/MEMORY.md
```

Expected: one match on the Key skills line.

- [ ] **Step 4: Manual smoke test**

Pause and ask the user:

> "The skill is written. To smoke-test it, please run `/resume-prompt` in this conversation (optionally with a trailing focus sentence) and verify the output matches the spec: 9 sections in order, `Skipped / Incomplete Work` populated or explicitly "None identified", and — if you passed an argument — a `## User Direction` section right after the Preamble."

Wait for the user's verdict. If output is correct, proceed to Step 5. If something is off, edit the SKILL.md to fix it and re-run the smoke test before committing.

- [ ] **Step 5: Stage the new skill file**

Run:

```bash
git -C /Users/max/Gits/claude-inits add skills/resume-prompt/SKILL.md
```

Run:

```bash
git -C /Users/max/Gits/claude-inits status --short
```

Expected: a single line `A  skills/resume-prompt/SKILL.md`. MEMORY.md lives outside the repo so it will not appear.

- [ ] **Step 6: Commit**

Per project git-safety rules, use multiple `-m` flags with literal newlines inside double quotes — never heredocs, never `$()` substitution:

```bash
git -C /Users/max/Gits/claude-inits commit -m "(feat) Add /resume-prompt skill" -m "- Generates copy-pasteable prompt for mid-task session resumption\n- Captures summary, git state, validation needs, blockers, skipped work, learnings, next steps\n- Accepts optional free-text trailing argument as User Direction (takes precedence over auto-derived next steps)"
```

- [ ] **Step 7: Post-commit verification**

Run:

```bash
git -C /Users/max/Gits/claude-inits log -1 --stat
```

Expected: the commit shows `skills/resume-prompt/SKILL.md` as the only file, with insertions in the 150-230 range.

Run:

```bash
ls /Users/max/Gits/claude-inits/skills/resume-prompt/
```

Expected: just `SKILL.md`.

---

## Acceptance Criteria Mapping

Cross-check against spec acceptance criteria:

| Spec AC | Satisfied by |
|---------|--------------|
| 1. Invokable via `/resume-prompt`; description distinguishes from `/start-session` and `/update-docs` | Task 1 (frontmatter) |
| 2. Produces fenced markdown block matching the Structure | Task 4 (Output Format) + smoke test in Task 7 |
| 3. Skipped / Incomplete Work always present | Task 4 (Section Rules table) + Task 5 (Guardrails reminder) |
| 4. Current State populated from actual git state | Task 3 (Inputs — MCP + bash commands) + Task 5 (Checklist item) |
| 5. User Direction omitted when no argument; amended-but-not-rewritten when present; Preamble treats it as primary | Task 2 (Invocation) + Task 4 (Output Format — User Direction template + Preamble language) |
| 6. Worked example covers both variants | Task 6 |
| 7. No file I/O | Task 5 (Guardrails) + the skill itself contains no write instructions |
| 8. MEMORY.md Key skills mentions `/resume-prompt` | Task 7 Steps 1-3 |
