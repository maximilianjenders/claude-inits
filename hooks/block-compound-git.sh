#!/bin/bash
# Block compound cd && / cd ; commands that trigger permission prompts.
# The permission system can't parse shell quoting, so cd + any separator
# is flagged regardless of what follows.
#
# Alternatives:
#   cd /path && git ...  →  git -C /path ...
#   cd /path && ls ...   →  ls /path/...
#   cd /path && cmd      →  Use absolute paths or tool-specific -C flags

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -qE '^\s*cd\s+[^;&|]*[;&|]+'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Compound cd commands (cd && ..., cd ; ..., cd | ...) trigger permission prompts. Use absolute paths instead. For git: git -C <path>. For other commands: use full paths directly."
    }
  }'
  exit 0
fi

exit 0
