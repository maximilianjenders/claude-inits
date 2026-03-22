#!/bin/bash
# Block compound cd && / cd ; commands for whitelisted commands only.
# The permission system can't parse shell quoting, so cd + separator
# triggers auth even when the base command is whitelisted.
#
# Only blocks when the command after cd is whitelisted (git, gh, etc.)
# since those would auto-approve without the cd prefix. For non-whitelisted
# commands, blocking just adds a round-trip without preventing any auth prompt.
#
# Alternatives:
#   cd /path && git ...  →  git -C /path ...
#   cd /path && cmd      →  Use absolute paths or tool-specific -C flags

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Extract the part after cd /path && / ; / |
if echo "$COMMAND" | grep -qE '^\s*cd\s+[^;&|]*[;&|]+'; then
  # Get the command after the separator
  AFTER=$(echo "$COMMAND" | sed -E 's/^\s*cd\s+[^;&|]*[;&|]+\s*//')
  # Only block if the command after cd is whitelisted (git, gh, mkdir, poetry, npm, npx)
  # For non-whitelisted commands, the user gets an auth prompt regardless —
  # blocking just adds an extra round-trip without preventing anything.
  if echo "$AFTER" | grep -qE '^\s*(git|gh|mkdir|poetry|npm|npx)\b'; then
    # Build a specific suggestion based on the command
    SUGGESTION="Use absolute paths instead."
    if echo "$AFTER" | grep -qE '^\s*git\b'; then
      DIR=$(echo "$COMMAND" | sed -E 's/^\s*cd\s+([^;&|]*)\s*[;&|]+.*/\1/')
      SUGGESTION="Use: git -C $DIR ${AFTER#git }"
    fi
    jq -n --arg reason "BLOCKED: Compound cd commands trigger permission prompts. $SUGGESTION" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: $reason
      }
    }'
    exit 0
  fi
fi

exit 0
