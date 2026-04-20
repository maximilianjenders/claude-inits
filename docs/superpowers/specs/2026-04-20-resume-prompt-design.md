# /resume-prompt Skill — Design Spec

**Date:** 2026-04-20
**Skill path:** `skills/resume-prompt/SKILL.md`

## Summary

Add a user-invocable `/resume-prompt` skill that produces a copy-pasteable prompt for a fresh Claude session. The prompt captures what was done, what still needs validation, what was skipped, blockers encountered, and suggested next steps. Intended for mid-task session resets under context pressure — not for clean handoffs between unrelated tasks.

## Motivation

When a working session is reset (context pressure, cache window expiring, switching machines) the next session starts blind. The user must either re-explain the state manually or accept that the new agent rediscovers it through file reads. Both are wasteful. A structured resume prompt preserves the non-derivable parts (intent, skipped steps, learnings) that cannot be recovered from `git log` or file contents alone.

## When to Use

| Situation | Use this skill? |
|-----------|-----------------|
| Mid-task, about to `/clear` or close terminal | Yes |
| Context window nearing full | Yes |
| Switching machines with work in progress | Yes |
| Project completion / PR handoff | No — use `/update-docs` and PR description |
| Scheduled session start on a new day | No — use `/start-session` |
| Pure conversational/exploratory session with no code changes | No — nothing to resume |

## Inputs (Sources)

The skill draws from two sources only:

1. **Current conversation** — the authoritative source for intent, skipped steps, blockers, learnings. Claude has this already; no tool call needed.
2. **Git state** — branch, uncommitted files, last commit. Gathered via three commands:
   ```bash
   git branch --show-current
   git status --short
   git log -1 --format='%h %s'
   ```

Explicitly **out of scope for inputs:** GitHub issues/PRs, milestones, CI state, remote branches. If the user is mid-PR-review or mid-milestone, those systems are already the source of truth and the resume prompt should reference them by number, not duplicate them.

## Output Format

The skill outputs a single fenced markdown block to chat. No file is written. The user copies it manually.

### Structure

```markdown
## Instruction Preamble
You are resuming work from a previous Claude Code session. Below is the
state at the point of reset. Before acting, confirm the branch matches
and run `git status` to verify the working tree. Then ask which of the
"Suggested Next Steps" to tackle, or wait for new direction.

## Session Summary
<1-3 sentences: what we set out to do and what got done>

## Current State
- **Branch:** <name>
- **Uncommitted changes:** <file list from `git status --short`, or "none">
- **Last commit:** <hash + title>

## Needs Validation
<Bugs fixed or features built that haven't been tested in-situ yet.
 One bullet per item, include *where* to validate.>
<If empty: omit section entirely>

## Blockers & Deeper Issues
<Problems encountered that weren't fully resolved — root causes not yet
 understood, tests that revealed unexpected behavior, dependencies that
 failed. One bullet per item.>
<If empty: omit section entirely>

## Skipped / Incomplete Work
<ALWAYS INCLUDED. Call out anything that was supposed to happen but
 didn't: steps from a command/skill that got abbreviated, acceptance
 criteria from an issue that weren't met, tasks the user asked for that
 weren't completed. One bullet per item.>
<If empty: write "None identified — but the next session should verify
 against the original request.">

## Key Learnings
<Non-obvious things discovered — gotchas, wrong assumptions corrected,
 decisions made with rationale. Skip anything already documented in
 GOTCHAS.md or code comments.>
<If empty: omit section entirely>

## Suggested Next Steps
<Ordered list. Lead with whatever most needs human validation or is most
 load-bearing for continued work.>
```

### Section Rules

| Section | Required | Omit when empty? |
|---------|----------|------------------|
| Instruction Preamble | Yes | Never |
| Session Summary | Yes | Never |
| Current State | Yes | Never (even on clean tree — show "none") |
| Needs Validation | Optional | Yes |
| Blockers & Deeper Issues | Optional | Yes |
| Skipped / Incomplete Work | Yes | Never (write "None identified" when empty) |
| Key Learnings | Optional | Yes |
| Suggested Next Steps | Yes | Never |

The asymmetry around "Skipped / Incomplete Work" is deliberate: the absence of skipped work is load-bearing information. An omitted section could mean "none" or "forgot to check" — explicit "None identified" distinguishes them.

## Skipped-Work Detection

This is the section most likely to be underfilled without explicit prompting. The skill's checklist forces Claude to scan the conversation for:

1. **Commands/skills whose steps were abbreviated.** Did any skill's checklist items get skipped? Did a command stop partway?
2. **Issue acceptance criteria not verified.** If an issue was worked on, were each of its acceptance criteria demonstrably met in the code?
3. **User requests deferred or half-addressed.** Did the user ask for something that got partially done, or got accepted verbally but not implemented?
4. **Test coverage gaps.** Was new code added without corresponding tests (per the project's test-first rule)?

Each item should name *what* was skipped and *why* (if known — context ran out, blocked on dependency, forgotten).

## Skill File Structure

Following the pattern of `skills/start-session/SKILL.md` and `skills/update-docs/SKILL.md`:

```
skills/resume-prompt/
└── SKILL.md
```

No supporting prompt templates — this skill is fully contained.

### SKILL.md Layout

| Section | Approximate length |
|---------|-------------------|
| Frontmatter (name, description, user_invocable) | 5 lines |
| Purpose + When to Use | ~20 lines |
| Inputs | ~15 lines |
| Output Format (the structure above) | ~50 lines |
| Skipped-Work Detection | ~15 lines |
| Worked Example | ~40 lines |
| Checklist | ~20 lines |
| Guardrails | ~10 lines |
| **Total** | ~175 lines |

### Worked Example

Include one complete sample output in the SKILL.md — not a realistic session, a deliberately minimal one that shows section voice and when to omit. Target: ~30-40 lines of sample output.

### Checklist

Must include, in order:
- [ ] Run the three git commands
- [ ] Draft Session Summary (1-3 sentences)
- [ ] Scan conversation for Skipped/Incomplete work (four detection prompts above)
- [ ] Identify Needs Validation items
- [ ] Identify Blockers
- [ ] Extract Key Learnings (skip if already in GOTCHAS.md)
- [ ] Order Suggested Next Steps by load-bearingness
- [ ] Assemble fenced markdown block
- [ ] Include Instruction Preamble verbatim
- [ ] Output to chat only — do NOT write a file

### Guardrails

- **Secrets scan:** Before outputting, check the prompt for secrets (API keys, tokens, passwords) that may have surfaced in the conversation. Redact with `<redacted>` and note the redaction in the preamble.
- **Length cap:** If total output exceeds ~200 lines, compress — prefer brevity over completeness. Resume prompts are consumed under context pressure on the receiving side too.
- **No file writes:** Explicit — the skill never writes to disk. User's choice to persist.

## Interaction with Existing Skills

| Skill | Relationship |
|-------|--------------|
| `start-session` | Complementary. `start-session` uses GitHub as source of truth for fresh sessions. `resume-prompt` uses conversation as source of truth for mid-task resumption. |
| `update-docs` | Complementary. Use `update-docs` before clean project-completion resets. Use `resume-prompt` before dirty mid-task resets. |
| `fix-pr` | Orthogonal. If mid-`fix-pr`, the resume prompt should name the PR number and note which feedback items were addressed vs. pending. |

## Non-Goals

- **Not a replacement for issues.** Skipped work that warrants tracking should be filed as an issue; the resume prompt is ephemeral.
- **Not a session log.** It captures state at the reset point, not a chronological narrative.
- **Not a handoff to another person.** The receiving agent is assumed to be a fresh Claude in the same repo — it can read the code, it just can't read the conversation.

## Acceptance Criteria

1. Skill invokable via `/resume-prompt`; `description` in frontmatter distinguishes it clearly from `/start-session` and `/update-docs`.
2. Running the skill on any session with code changes produces a fenced markdown block matching the Structure above.
3. "Skipped / Incomplete Work" section always present, with "None identified" when empty.
4. "Current State" section populated from actual git state (verified against `git status` output).
5. One worked example in SKILL.md that a reader can use to calibrate section voice.
6. No file I/O — skill outputs to chat only.
7. MEMORY.md entry under "Key Skills" updated to mention `/resume-prompt`.

## Open Questions

None — all resolved in brainstorming.
