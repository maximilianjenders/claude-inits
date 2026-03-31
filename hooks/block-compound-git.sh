#!/bin/bash
# Block compound commands that bypass the permission system.
#
# Catches:
#   1. cd + separator (&&, ;, |, newline) + whitelisted command
#   2. Any command with pipes (cmd | tail, cmd 2>&1 | head)
#
# Only blocks cd-chaining when the command after cd is whitelisted
# (git, gh, uv, poetry, npm, npx, pytest, ruff, mypy, alembic, pre-commit)
# since those would auto-approve without the cd prefix. For non-whitelisted
# commands, blocking just adds a round-trip without preventing any auth prompt.
#
# Alternatives:
#   cd /path && git ...     →  git -C /path ...
#   cd /path\nuv run ...    →  Two separate Bash calls
#   cmd | tail -20          →  Run cmd alone (or use head_limit in Grep)

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

WHITELISTED='(git|gh|mkdir|poetry|npm|npx|uv|pytest|ruff|mypy|alembic|pre-commit)'

# 1. Block cd + inline separator (&&, ;, |) + whitelisted command
if echo "$COMMAND" | grep -qE '^\s*cd\s+[^;&|]*[;&|]+'; then
  AFTER=$(echo "$COMMAND" | sed -E 's/^[[:space:]]*cd[[:space:]]+[^;&|]*[;&|]+[[:space:]]*//')
  if echo "$AFTER" | grep -qE "^\s*${WHITELISTED}\b"; then
    DIR=$(echo "$COMMAND" | sed -E 's/^[[:space:]]*cd[[:space:]]+([^;&|]*)[[:space:]]*[;&|]+.*/\1/')
    jq -n --arg reason "BLOCKED: Compound cd command. Use separate Bash calls or tool-specific flags (e.g. git -C $DIR ...)." '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: $reason
      }
    }'
    exit 0
  fi
fi

# 2. Block cd + newline + whitelisted command (multiline)
FIRST_LINE=$(echo "$COMMAND" | head -1)
SECOND_LINE=$(echo "$COMMAND" | sed -n '2p')
if echo "$FIRST_LINE" | grep -qE '^\s*cd\s+'; then
  if [ -n "$SECOND_LINE" ]; then
    if echo "$SECOND_LINE" | grep -qE "^\s*${WHITELISTED}\b"; then
      DIR=$(echo "$FIRST_LINE" | sed -E 's/^[[:space:]]*cd[[:space:]]+//' | sed 's/[[:space:]]*$//')
      jq -n --arg reason "BLOCKED: Multiline cd + command. Use separate Bash calls: first cd into '$DIR', then run the command separately." '{
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: $reason
        }
      }'
      exit 0
    fi
  fi
fi

# 3. Block pipes to post-processing commands (tail, head, grep, etc.)
# Skip for git commit/tag — their -m args may contain literal | characters.
PIPE_TARGETS='(tail|head|grep|awk|sed|wc|sort|cut|tee|less|more|cat)'
if echo "$COMMAND" | grep -qE "\|[[:space:]]*${PIPE_TARGETS}\b"; then
  if echo "$COMMAND" | grep -qE '^\s*git\s+(commit|tag)\b'; then
    : # skip — pipe is likely inside a -m message string
  else
  FIRST_CMD=$(echo "$COMMAND" | sed -E "s/\|[[:space:]]*${PIPE_TARGETS}\b.*//")
  if echo "$FIRST_CMD" | grep -qE "^\s*(cd\s+.*\s+)?${WHITELISTED}\b"; then
    jq -n --arg reason "BLOCKED: Piped command. Run the command without the pipe — use separate Bash calls if you need to post-process output." '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: $reason
      }
    }'
    exit 0
  fi
  fi
fi

exit 0
