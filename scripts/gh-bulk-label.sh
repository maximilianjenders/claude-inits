#!/bin/bash
# Bulk add/remove labels from GitHub issues
# Usage:
#   gh-bulk-label.sh add <label> <issue1> [issue2] ...
#   gh-bulk-label.sh remove <label> <issue1> [issue2] ...
#
# Examples:
#   gh-bulk-label.sh remove code-complete 76 77 78 80
#   gh-bulk-label.sh add in-progress 15 16 17

ACTION="$1"
LABEL="$2"
shift 2

if [ -z "$ACTION" ] || [ -z "$LABEL" ] || [ $# -eq 0 ]; then
  echo "Usage: gh-bulk-label.sh <add|remove> <label> <issue1> [issue2] ..."
  exit 1
fi

case "$ACTION" in
  add)
    for ISSUE in "$@"; do
      if gh issue edit "$ISSUE" --add-label "$LABEL"; then
        echo "Added '$LABEL' to #$ISSUE"
      else
        echo "Failed to add '$LABEL' to #$ISSUE"
      fi
      sleep 0.5
    done
    ;;
  remove)
    for ISSUE in "$@"; do
      if gh issue edit "$ISSUE" --remove-label "$LABEL"; then
        echo "Removed '$LABEL' from #$ISSUE"
      else
        echo "Failed to remove '$LABEL' from #$ISSUE"
      fi
      sleep 0.5
    done
    ;;
  *)
    echo "Unknown action: $ACTION (use 'add' or 'remove')"
    exit 1
    ;;
esac

echo "Done"
