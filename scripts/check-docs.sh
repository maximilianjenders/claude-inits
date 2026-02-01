#!/bin/bash
# Check if standard documentation files exist in current directory
# Usage:
#   check-docs.sh [directory]
#
# Checks for: CLAUDE.md, README.md, STATUS.md, DECISIONS.md, GOTCHAS.md

DIR="${1:-.}"

echo "=== Documentation Check: $DIR ==="

for DOC in CLAUDE.md README.md STATUS.md DECISIONS.md GOTCHAS.md; do
  if [ -f "$DIR/$DOC" ]; then
    echo "✓ $DOC"
  else
    echo "✗ $DOC (missing)"
  fi
done
