# Shared Claude Code Standards

These rules apply to all projects under `~/Gits/`.

## Git Safety

For multi-line commit messages, use multiple `-m` flags: first `-m` for title, second `-m` for body (literal newlines in double quotes are fine). Never use `$(cat <<'EOF'...)` heredocs or `$'...\n...'` ANSI-C quoting — both trigger permission prompts even with `git*` whitelisted.

Never use `cd <path> && ...` compound commands — they trigger permission prompts. Use absolute paths instead (`git -C <path>`, `ls /full/path`, etc.). This is enforced by a global PreToolUse hook that blocks all `cd && ...` / `cd ; ...` patterns.

Never put shell metacharacters (`&&`, `;`, `|`, `$()`) in commit message text — the permission system pattern-matches the raw command string without parsing quoting, so `git commit -m "block cd && git"` triggers a compound-command prompt. Rephrase instead.

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

## Workflow Rules

- **Test-first:** Write tests before code. Don't accumulate untested code.
- **Quality bias:** Never auto-defer quality issues. Fix now or ask user.
- **Ask, don't work around:** Stop and ask when credentials missing, deps unavailable, or requirements ambiguous.
- **Understand before fixing:** When given feedback about broken or wrong behavior, don't jump to a fix. Diagnose the root cause, examine the codebase, and capture the actual problem behind the reported symptom.
- **Verify, don't assert:** Test your fix before claiming it works — run it, show output. Quick fixes especially need validation; "this should work now" without evidence is not acceptable.
- **Modular by default:** Build small, focused units — functions that do one thing, components that render one concern, files that own one responsibility. When adding to an existing file, ask: does this belong here, or does it need its own module? Bias toward extraction over extension. Guardrails: functions over 50 lines, components over 300 lines, or files over 500 lines should be split.
- **Generalize fixes:** When fixing a bug or mistake, assume it could be a recurring pattern. Search for similar instances across the codebase. If you find them, flag them to the user and suggest a principled fix. If the root cause is a common trap, suggest adding it to GOTCHAS.md.

## When to Run Tests

| Context | Unit | E2E |
|---------|------|-----|
| During implementation | Scoped only | No |
| At commit time | Full (pre-commit) | No |
| At PR creation | Skip | Yes |
| After PR review fixes | Skip | No |
| After staging fixes | Skip | Yes |

## Logging

Follow existing logging patterns in codebase. Use structured key=value format.
