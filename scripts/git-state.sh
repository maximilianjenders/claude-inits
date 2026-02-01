#!/bin/bash
# Detect current git state for branching decisions
# Usage: git-state.sh [branch-pattern]
#   branch-pattern: optional regex to search for (default: "phase|milestone|feature")

echo "=== Current State ==="
echo "Current branch: $(git branch --show-current)"
echo ""

echo "=== Worktree Check ==="
if [ -f .git ]; then
  echo "In worktree: $(cat .git | sed 's/gitdir: //')"
else
  echo "In main repo (not a worktree)"
fi
echo ""

echo "=== Existing Worktrees ==="
git worktree list
echo ""

echo "=== Check for target branch ==="
PATTERN="${1:-phase|milestone|feature}"
git branch -a | grep -iE "$PATTERN" || echo "No matching branches found"
