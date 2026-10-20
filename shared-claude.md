# Shared Claude Code Standards

These rules apply to all projects under `~/Gits/`.

## Git Safety

For multi-line commit messages, use multiple `-m` flags: first `-m` for title, second `-m` for body (literal newlines in double quotes are fine). Never use `$(cat <<'EOF'...)` heredocs or `$'...\n...'` ANSI-C quoting — both trigger permission prompts even with `git*` whitelisted.

Never use `cd <path> && ...` or `cd <path> ; ...` compound commands — they trigger permission prompts. This is enforced by a global PreToolUse hook. Use absolute paths or tool-specific flags instead:

| Instead of | Use |
|------------|-----|
| `cd dir && git ...` | `git -C dir ...` |
| `cd dir && ls` | `ls dir` |
| `cd dir && poetry run pytest ...` | `poetry -C dir run pytest ...` |
| `cd dir && poetry run python ...` | `poetry -C dir run python ...` |
| `cd dir && npm ...` | `npm --prefix dir ...` |
| `cd dir && command` | Separate Bash calls: first `cd dir`, then `command` |

The last row is the general fallback — split into two sequential Bash tool calls.

**Never chain commands with `&&`, `;`, or `|` in a single Bash call.** This applies to all commands, not just `cd`. Use separate sequential Bash tool calls instead. Example: `git diff && git status` → two separate Bash calls, one for `git diff`, one for `git status`.

Never put shell metacharacters (`&&`, `;`, `|`, `$()`) in commit message text — the permission system pattern-matches the raw command string without parsing quoting, so `git commit -m "block cd && git"` triggers a compound-command prompt. Rephrase instead.

Never use `#` comments in multi-line inline scripts (e.g., `python -c "..."`, heredocs). A quoted newline followed by a `#`-prefixed line triggers a permission prompt ("can hide arguments from line-based permission checks"). Remove comments or move the script to a file.

Never dispatch subagents with `mode: "bypassPermissions"` — it skips PreToolUse hooks, disabling safety guardrails like the compound-command blocker. Use `mode: "default"` instead; allow rules in `settings.json` handle auto-approval of whitelisted commands.

## Terminology

| Preferred | Avoid |
|-----------|-------|
| blacklist | blocklist |
| whitelist | allowlist |
| master    | main  |

## Milestones

- `Backlog` milestone is a bucket — it NEVER closes
- Feature milestones close when complete
- Promote backlog items to feature milestones when ready

## Project Documentation

| File | Rules |
|------|-------|
| DECISIONS.md | Append-only, never delete, number for cross-ref (D1, D2), include WHY |
| GOTCHAS.md | Reusable fixes only, copy-pasteable, group by Codebase/Environment/Debugging |

Use `/update-docs` at session end.

## Form Error Handling

**No silent data loss in forms.** Never let a form submit successfully while silently discarding user-entered values. If input can't be parsed, validated, or fetched, show an inline error and keep the form open. Prefer `type="text" inputMode="decimal"` over `type="number"` for decimal inputs to avoid locale-dependent parsing bugs (e.g., German locale uses comma as decimal separator, causing dot-separated values to be silently dropped). Silent `catch` blocks that swallow errors without user feedback are a code smell — always surface failures visibly.

## HARD OVERRIDE: Plannotator Review Gate

**Every design doc or spec MUST go through plannotator before implementation planning**, however it was created. After writing it: commit → invoke `plannotator:plannotator-annotate` → address all feedback → ONLY THEN writing-plans / writing-implementation-tasks.

**Brainstorming override:** after steps 1-4 (questions, approach), skip step 5 (verbal design presentation) and write the spec straight to `docs/superpowers/specs/`. Steps 7 (spec-review subagent) and 8 (user reviews spec) are replaced by plannotator-annotate. The plannotator `ExitPlanMode` hook is disabled — this explicit invocation replaces it.

## HARD OVERRIDE: Plan → Milestone Gate

**`writing-plans`' "Execution Handoff" step is disabled** — it skips issue creation. After any plan is saved (`docs/superpowers/plans/*.md` or `docs/plans/*/`, via writing-plans or writing-implementation-tasks):

1. Immediately invoke `/create-milestone` (Workflow B): one issue per `## Task N`, milestone to `[READY]`.
2. Tell the user execution happens in a **new session** via `/start-milestone <number>`. Never ask "Subagent-Driven or Inline Execution?".

## Skill Stop Boundaries

**An explicit STOP in a skill is authoritative** (e.g. `/fix-pr` Feedback Mode). Cross it only on an unambiguous instruction to proceed past that point — a fresh invocation like `/fix-pr --implement`, or a plain yes to that exact question. An answer to a different question ("fix everything") scopes *what* gets fixed; it doesn't authorize skipping the handoff. If either reading is possible, stop and ask. "I already have the context" is no reason to skip a checkpoint — it may exist to give the user a review point. See [[feedback_skill_stop_boundaries]].

## Scope Integrity

**Never silently drop scope.** When implementing a plan, every task and every acceptance criterion must be either:
1. Implemented and verified, or
2. Explicitly flagged to the user as incomplete before marking the issue done.

An issue is NOT code-complete if acceptance criteria are unmet. If time/context pressure forces partial implementation, say so — don't mark it done and move on. Quietly reducing scope is worse than stopping and asking, because it creates false confidence that the work is finished.

When reviewing issues for completion, check each acceptance criterion individually against the actual code changes. "Backend supports it" does not satisfy a frontend acceptance criterion.

## Plan Execution — Task Accounting

When implementing from a plan with `## Task N` sections:

- **One GitHub issue per task before any code is written.**
- **One task = one commit = one closed issue**, citing the issue number. Only exception: `/start-milestone` phase batch commits — reviewers must then verify each task's acceptance criteria individually against the diff.
- **Driver issue can't close while task issues are open.** Defer a task by labelling it `deferred` and referencing it in the driver's close comment.
- **Each acceptance criterion needs evidence at close** (test name, query output, screenshot URL). No evidence = not closed.

Full rules and rationale: `~/.claude/shared/plan-execution.md` — read it before closing plan task issues or reviewing a plan-driven PR.

## Test Infrastructure

- **New test files must use existing conftest fixtures** — before writing inline setup, check `conftest.py` in the test directory. If a fixture doesn't exist but the pattern repeats 3+ times, create one.
- **No expensive operations in test setup loops** — bcrypt, subprocess calls, network requests, and file I/O should be computed once (module/session-scoped) and reused. If a test needs a fresh value, justify it.

## Workflow Rules

- **Test-first:** Write tests before code. Don't accumulate untested code.
- **Quality bias:** Never auto-defer quality issues. Fix now or ask user.
- **Ask, don't work around:** Stop and ask when credentials missing, deps unavailable, or requirements ambiguous.
- **Understand before fixing:** Diagnose the root cause behind a reported symptom before changing anything. Don't tune parameters blindly — "MAX_TOKENS hit → increase max_tokens" is symptom-chasing; measure sizes, query the DB, check logs first.
- **Verify, don't assert:** Run the fix and show output before claiming it works. "This should work now" is not evidence.
- **Lean sweeps:** For sweeps whose raw output you won't edit (issue/PR/label lists, repo-wide greps), project fields with `--jq` or delegate to an Explore agent and keep only the answer. Code you will edit, read directly — a cold subagent costs 35-50k of its own baseline.
- **Modular by default:** Small units that each own one responsibility; bias toward extraction over extension. Guardrails: functions over 50 lines, components over 300 lines.
- **File size:** Mixed concerns in one file cost navigation, not line count. Logic files (routes, services, components, utilities): extract at 400 lines, hard ceiling 500. Test files: ~500, split when they cover separable behaviors. Data-only files (seed data, lookup tables, generated code, config) are exempt — declare exemptions in a directory-level CLAUDE.md. When refactoring for size, acceptance criteria MUST include file-level line targets, not just function-level.
- **No `dict[str, Any]` for structured data:** Use TypedDict, dataclass, or NamedTuple; `dict[str, Any]` only at I/O boundaries (JSON parsing, external APIs).
- **Declarative mappings over imperative wiring:** When data flows through layers, define the field mapping once as a table + generic applicator, with one test iterating the mapping to the destination. Each manual `if field: set(field)` is a silent-drop bug.
- **Never accept-and-ignore parameters:** Every parameter in a signature must be used in the body; an unreferenced parameter is a silent bug.
- **Helpers near callers:** Place extracted helpers where they're used; if 2+ files need them, extract to a shared module immediately.
- **Generalize fixes:** Assume a bug is a pattern — search for similar instances, flag them, suggest a principled fix (and a GOTCHAS.md entry for common traps). A fix isn't complete until the prevention is implemented or an issue is created for it.

## When to Run Tests

| Context | Unit | E2E |
|---------|------|-----|
| During implementation | Scoped only | No |
| At commit time | Full (pre-commit) | No |
| At PR creation | Skip | Yes |
| After PR review fixes | Skip | No |
| After staging fixes | Skip | Yes |

## Error Handling

- **Errors are user-facing communication.** Every error the user sees must answer three questions: *What* failed? *Why* did it fail? *What can I do about it?* A message like "Failed to save" answers none of these. "Could not save ingredient: name already exists. Try a different name." answers all three.
- **Surface the specific cause.** Pass backend validation messages, constraint violations, and HTTP error bodies through to the user. Never replace a specific API error with a generic fallback unless the original is truly unintelligible.
- **Fail visibly, never silently.** Swallowing errors — empty catch blocks, ignored promise rejections, bare `except: pass` — is always wrong. If an operation can fail, the user must know it failed.
- **Preserve context for debugging.** Log the full error (status code, response body, stack trace) even when showing the user a simplified message. The developer and the user need different levels of detail, but neither should get zero.

## Logging

Follow existing logging patterns in codebase. Use structured key=value format.
