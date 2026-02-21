# Gotchas & Troubleshooting

Quick reference for known pitfalls and their solutions.

---

## Codebase

[Add codebase-specific gotchas as you encounter them]

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
