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

**Every design doc or spec MUST go through plannotator before implementation planning.** This applies regardless of how the doc was created — brainstorming skill, manual writing, or any other flow.

After writing any design doc:
1. Commit it
2. Immediately invoke `plannotator:plannotator-annotate` on the document
3. Address all annotation feedback
4. ONLY THEN proceed to writing-plans or writing-implementation-tasks

**Brainstorming skill override (steps 5-8):** After clarifying questions and approach selection (steps 1-4), skip verbal design presentation — write the spec directly to `docs/superpowers/specs/`, then follow the gate above. Verbal presentation is redundant when plannotator gives an interactive visual review.

- Step 5 (present design sections verbally) → skipped, write the doc instead
- Step 7 (spec-review-subagent loop) → replaced by plannotator-annotate
- Step 8 (user reviews spec) → replaced by plannotator-annotate

The `ExitPlanMode` hook in plannotator is disabled — this explicit invocation replaces it.

## Scope Integrity

**Never silently drop scope.** When implementing a plan, every task and every acceptance criterion must be either:
1. Implemented and verified, or
2. Explicitly flagged to the user as incomplete before marking the issue done.

An issue is NOT code-complete if acceptance criteria are unmet. If time/context pressure forces partial implementation, say so — don't mark it done and move on. Quietly reducing scope is worse than stopping and asking, because it creates false confidence that the work is finished.

When reviewing issues for completion, check each acceptance criterion individually against the actual code changes. "Backend supports it" does not satisfy a frontend acceptance criterion.

## Workflow Rules

- **Test-first:** Write tests before code. Don't accumulate untested code.
- **Quality bias:** Never auto-defer quality issues. Fix now or ask user.
- **Ask, don't work around:** Stop and ask when credentials missing, deps unavailable, or requirements ambiguous.
- **Understand before fixing:** When given feedback about broken or wrong behavior, don't jump to a fix. Diagnose the root cause, examine the codebase, and capture the actual problem behind the reported symptom.
  - Don't tune parameters blindly. When a limit, threshold, or budget appears insufficient, investigate why it's being exceeded before adjusting it. "MAX_TOKENS hit → increase max_tokens" is symptom-chasing. The root cause may be entirely different (e.g., hidden token consumption, wrong model defaults, misconfigured middleware). Verify the actual data — measure sizes, query the DB, check logs — before proposing a number change.
- **Verify, don't assert:** Test your fix before claiming it works — run it, show output. Quick fixes especially need validation; "this should work now" without evidence is not acceptable.
- **Modular by default:** Build small, focused units — functions that do one thing, components that render one concern, files that own one responsibility. When adding to an existing file, ask: does this belong here, or does it need its own module? Bias toward extraction over extension. Guardrails: functions over 50 lines, components over 300 lines.
- **File size — why it matters:** Large files with mixed concerns (routes + helpers, UI + logic, multiple domains) force AI to scan hundreds of lines to locate relevant code. The cost is not the line count itself but the navigation overhead of interleaved concerns. Keep logic-containing files small so each file owns one responsibility.
- **File size — guidelines for logic files:** Extract at 400 lines, split by 500. These apply to files with branching logic: route handlers, service modules, React components, utility libraries. 400 is the warning to extract; 500 is the hard ceiling.
- **File size — test files:** 500-line guideline. Split when a test file covers multiple behaviors that could live in separate files (e.g., CRUD vs. analytics, unit vs. integration). A single cohesive test suite that happens to be long is less costly than a mixed one.
- **File size — exempt: data-only files.** Seed data, lookup tables, generated code, and configuration files with no branching logic are exempt from line limits. No mixed concerns = no navigation cost. Exemptions are declared in directory-level CLAUDE.md files close to the code.
- **File-level targets in refactoring:** When refactoring for size, acceptance criteria MUST include file-level line count targets, not just function-level. AI will minimize functions without reducing files unless explicitly told to.
- **No `dict[str, Any]` for structured data:** Use TypedDict, dataclass, or NamedTuple for data passed between functions. `dict[str, Any]` is only acceptable at I/O boundaries (JSON parsing, external APIs).
- **Helpers near callers, not sources:** When extracting helpers, place them where they're used. If 2+ functions across different files would benefit, extract to a shared module immediately — don't leave helpers stranded in their original file.
- **Generalize fixes:** When fixing a bug or mistake, assume it could be a recurring pattern. Search for similar instances across the codebase. If you find them, flag them to the user and suggest a principled fix. If the root cause is a common trap, suggest adding it to GOTCHAS.md. A fix is not complete until either (1) the prevention is implemented, or (2) an issue is created for it. Describing the root cause without acting on it is not a fix.

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
