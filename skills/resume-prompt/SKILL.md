---
name: resume-prompt
description: Generate a compact copy-pasteable prompt to resume mid-task work in a fresh Claude session. Captures git state, open items (validation, blockers, skipped/untracked work), learnings, and next steps. Accepts optional free-text trailing argument for explicit user direction.
user_invocable: true
---

# Resume Prompt

Output a short, copy-pasteable prompt so a fresh session can continue in-flight work. For mid-task resets (context pressure, machine switch) — not for finished work (`/update-docs`) or day starts (`/start-session`).

`/resume-prompt [optional direction]` — the argument is the user's steering for the next session and outranks your own Next steps. Keep their intent, order, and phrasing; only expand shorthand into concrete references (file, test, issue #).

## Steps

1. **Git state:** `mcp__workflow__git_state()` (fallback: `git branch --show-current`, `git status --short`, `git log -1 --format='%h %s'`, `git worktree list`).
2. **Scan the conversation** for open items:
   - `validate` — built/fixed but not verified; name the exact test, URL, or command
   - `blocker` — unresolved problem or unexplained behavior
   - `skipped` — skill steps cut short, acceptance criteria unmet, user requests half-done, code without tests
   - `untracked` — bugs/ideas with no issue, items in the wrong milestone, work outside the active issue
3. **Learnings** (non-obvious, not already in GOTCHAS.md/code). If any:
   - Domain learning that matches an open issue (`mcp__workflow__gh_issue({ action: "list", state: "open" })`) → `gh issue comment <n> --body "**Session learning:** ..."`. Never edit issue bodies.
   - Reusable doc material → propose one line each (GOTCHAS.md / CLAUDE.md / DECISIONS.md / memory), wait for approve/dismiss/defer, apply approved, put deferred into Next.
4. **Output** the block below in chat. No file.

## Output

One fenced block, target under 30 lines. Omit any line or bullet group that's empty, except **Open**.

```
Resuming a previous Claude Code session. First confirm branch/worktree and run `git status`. <With Direction: "Work toward Direction first; use Next once it's done or blocked." Without: "Ask which Next step to take.">

**Direction:** <user argument, lightly clarified>
**Done:** <1-2 sentences: goal and what got done>
**State:** branch `<name>` · worktree `<path, if not primary clone>` · last `<hash> <title>` · uncommitted: <files or none>
**Open:**
- [validate] <item> — <how to check>
- [blocker] <item>
- [skipped] <item> — <why>
- [untracked] <item>
**Learned:** <terse bullets, only if they change how the next session works>
**Next:**
1. <most load-bearing first>
```

If nothing is open, write `**Open:** none found — verify against the original request.` (explicit "none" means checked, not forgotten).

## Rules

- Terse fragments over prose; reference issues/PRs by number instead of restating them.
- No hard-wrapped lines.
- Redact secrets as `<redacted>` and say so in the first line.
