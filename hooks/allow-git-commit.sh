#!/bin/bash
# Auto-allow git commit -m commands that get flagged by the
# "quoted characters in flag names" secondary security check.
# The permission whitelist Bash(git:*) doesn't override this check,
# but a PreToolUse hook with permissionDecision: "allow" does.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Match: git commit -m ... or git -C <path> commit -m ...
if echo "$COMMAND" | grep -qE '^\s*git\s+(-C\s+\S+\s+)?commit\s+.*-m\s'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "git commit -m is safe to auto-allow"
    }
  }'
  exit 0
fi

exit 0
