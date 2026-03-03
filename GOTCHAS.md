# Gotchas & Troubleshooting

Quick reference for known pitfalls and their solutions.

---

## Codebase

### Avoid Shell Metacharacters in Commit Messages

The permission system pattern-matches the **raw command string** without parsing shell quoting. Characters like `&&`, `;`, `|` inside quoted `-m` arguments still trigger compound-command detection, causing a confirmation prompt even when `Bash(git:*)` is whitelisted.

```bash
# BAD — triggers permission prompt because of && in message text
git commit -m "(feat): Block cd && git compound commands"

# GOOD — no metacharacters in message
git commit -m "(feat): Block compound cd-then-git commands"
```

**Rule:** Never put `&&`, `;`, `|`, or `$()` in commit message text. Rephrase instead.

---

## Environment

### Plannotator ExitPlanMode Hook Must Be Disabled

The `plannotator` plugin ships with a hook that fires on `ExitPlanMode`, which triggers after `writing-plans` (implementation plans). We want plannotator on **design docs** instead, so we invoke `plannotator:plannotator-annotate` explicitly in our skills.

**The hook must be manually disabled** because plugin updates will restore it:

```
# File: ~/.claude/plugins/cache/plannotator/plannotator/*/hooks/hooks.json
# Replace contents with:
{ "hooks": {} }
```

**When to re-check:** After any `plugin update plannotator` or if you notice plannotator opening unexpectedly on `ExitPlanMode`. The symptom is plannotator UI popping up when finishing an implementation plan rather than a design doc.

**Where the explicit invocation lives:** `skills/create-issue/SKILL.md` Full Mode Step 2.5 invokes `plannotator:plannotator-annotate` on the design doc after brainstorming.

---

## Debugging

[Add debugging patterns as you discover them]
