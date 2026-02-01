#!/bin/bash
# Extract issue numbers from text
# Usage:
#   extract-issue-numbers.sh <text>
#   echo "text" | extract-issue-numbers.sh
#
# Examples:
#   extract-issue-numbers.sh "Fixes #12, #13, and #14"
#   gh pr view 42 --json body -q .body | extract-issue-numbers.sh
#   gh issue view 15 --json body -q .body | extract-issue-numbers.sh

if [ -n "$1" ]; then
  INPUT="$1"
else
  INPUT=$(cat)
fi

echo "$INPUT" | grep -oE '#[0-9]+' | tr -d '#' | sort -un
