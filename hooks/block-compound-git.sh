#!/bin/bash
# Block compound cd && git / cd ; git commands that trigger permission prompts.
# Suggests git -C <path> instead.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -qE '^\s*cd\s+[^;&]*[;&]+\s*git\b'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Compound \"cd ... && git\" and \"cd ... ; git\" commands trigger permission prompts. Use \"git -C <path> <command>\" instead."
    }
  }'
  exit 0
fi

exit 0
