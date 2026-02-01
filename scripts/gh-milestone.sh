#!/bin/bash
# Milestone operations via GitHub API
# Usage:
#   gh-milestone.sh find <title-pattern>   - Find milestone number by title
#   gh-milestone.sh close <number|title>   - Close a milestone
#   gh-milestone.sh open <number|title>    - Reopen a milestone
#   gh-milestone.sh rename <number|title> <new-title>
#
# Examples:
#   gh-milestone.sh find "Code Quality"
#   gh-milestone.sh close 14
#   gh-milestone.sh close "Phase 5"         # Finds by title, then closes
#   gh-milestone.sh rename "Phase 5" "[DONE] Phase 5: Variety Tracking"

ACTION="$1"
IDENTIFIER="$2"

if [ -z "$ACTION" ] || [ -z "$IDENTIFIER" ]; then
  echo "Usage: gh-milestone.sh <find|close|open|rename> <number|title> [new-title]"
  echo ""
  echo "Actions:"
  echo "  find <title>     - Find milestone number by title pattern"
  echo "  close <id>       - Close milestone (by number or title)"
  echo "  open <id>        - Reopen milestone (by number or title)"
  echo "  rename <id> <t>  - Rename milestone"
  echo ""
  echo "Examples:"
  echo "  gh-milestone.sh find \"Code Quality\""
  echo "  gh-milestone.sh close 14"
  echo "  gh-milestone.sh close \"Phase 5\""
  exit 1
fi

# Helper: resolve identifier to milestone number
resolve_milestone() {
  local id="$1"
  if [[ "$id" =~ ^[0-9]+$ ]]; then
    echo "$id"
  else
    # Search by title
    local num=$(gh api "repos/:owner/:repo/milestones" --jq ".[] | select(.title | contains(\"$id\")) | .number" | head -1)
    if [ -z "$num" ]; then
      echo "Error: Milestone matching '$id' not found" >&2
      return 1
    fi
    echo "$num"
  fi
}

case "$ACTION" in
  find)
    RESULT=$(gh api "repos/:owner/:repo/milestones" --jq ".[] | select(.title | contains(\"$IDENTIFIER\")) | \"#\\(.number): \\(.title) [\\(.state)]\"")
    if [ -z "$RESULT" ]; then
      echo "No milestone matching '$IDENTIFIER' found"
      exit 1
    fi
    echo "$RESULT"
    ;;
  close)
    MILESTONE_NUM=$(resolve_milestone "$IDENTIFIER") || exit 1
    gh api "repos/:owner/:repo/milestones/$MILESTONE_NUM" -X PATCH -f state="closed" && \
      echo "Closed milestone #$MILESTONE_NUM" || \
      echo "Failed to close milestone #$MILESTONE_NUM"
    ;;
  open)
    MILESTONE_NUM=$(resolve_milestone "$IDENTIFIER") || exit 1
    gh api "repos/:owner/:repo/milestones/$MILESTONE_NUM" -X PATCH -f state="open" && \
      echo "Opened milestone #$MILESTONE_NUM" || \
      echo "Failed to open milestone #$MILESTONE_NUM"
    ;;
  rename)
    NEW_TITLE="$3"
    if [ -z "$NEW_TITLE" ]; then
      echo "Error: new title required for rename"
      exit 1
    fi
    MILESTONE_NUM=$(resolve_milestone "$IDENTIFIER") || exit 1
    gh api "repos/:owner/:repo/milestones/$MILESTONE_NUM" -X PATCH -f title="$NEW_TITLE" && \
      echo "Renamed milestone #$MILESTONE_NUM to '$NEW_TITLE'" || \
      echo "Failed to rename milestone #$MILESTONE_NUM"
    ;;
  *)
    echo "Unknown action: $ACTION (use 'find', 'close', 'open', or 'rename')"
    exit 1
    ;;
esac
