#!/bin/bash
# List issues in a milestone with optional filters
# Usage:
#   gh-milestone-issues.sh <milestone> [state] [label]
#
# Arguments:
#   milestone: Milestone title (e.g., "[READY] Phase 5: Variety Tracking")
#   state: open, closed, or all (default: all)
#   label: Filter by label (optional)
#
# Examples:
#   gh-milestone-issues.sh "[READY] Phase 5: Variety Tracking"
#   gh-milestone-issues.sh "[ACTIVE] Phase 5" open
#   gh-milestone-issues.sh "[ACTIVE] Phase 5" all code-complete
#   gh-milestone-issues.sh "[ACTIVE] Phase 5" open pr-review

MILESTONE="$1"
STATE="${2:-all}"
LABEL="$3"

if [ -z "$MILESTONE" ]; then
  echo "Usage: gh-milestone-issues.sh <milestone> [state] [label]"
  echo ""
  echo "Arguments:"
  echo "  milestone  Milestone title (required)"
  echo "  state      open, closed, or all (default: all)"
  echo "  label      Filter by label (optional)"
  echo ""
  echo "Examples:"
  echo "  gh-milestone-issues.sh \"[READY] Phase 5: Variety Tracking\""
  echo "  gh-milestone-issues.sh \"[ACTIVE] Phase 5\" open"
  echo "  gh-milestone-issues.sh \"[ACTIVE] Phase 5\" all code-complete"
  exit 1
fi

# Build the gh command
CMD="gh issue list --milestone \"$MILESTONE\" --state $STATE"

if [ -n "$LABEL" ]; then
  CMD="$CMD --label \"$LABEL\""
fi

CMD="$CMD --json number,title,state,labels"

# Execute and format output
eval "$CMD" | jq -r '.[] | "#\(.number): \(.title) [\(.state)] \(if .labels | length > 0 then "(" + ([.labels[].name] | join(", ")) + ")" else "" end)"' | sort -t'#' -k2 -n
