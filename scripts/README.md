# Claude Scripts

Helper scripts for common operations. Symlinked to `~/.claude/scripts/` for auto-whitelisting.

## Setup

```bash
ln -s /Users/max/Gits/claude-inits/scripts ~/.claude/scripts
```

Permissions in `~/.claude/settings.json`:
```json
"Bash(/Users/max/.claude/scripts/*)",
"Bash(/Users/max/.claude/scripts/*.sh *)",
```

## Scripts

### git-state.sh
Detect current git state for branching decisions.

```bash
~/.claude/scripts/git-state.sh [branch-pattern]
```

Outputs: current branch, worktree status, existing worktrees, matching branches.

### gh-bulk-label.sh
Bulk add/remove labels from GitHub issues.

```bash
~/.claude/scripts/gh-bulk-label.sh add <label> <issue1> [issue2] ...
~/.claude/scripts/gh-bulk-label.sh remove <label> <issue1> [issue2] ...
```

Examples:
```bash
~/.claude/scripts/gh-bulk-label.sh remove code-complete 76 77 78 80
~/.claude/scripts/gh-bulk-label.sh add in-progress 15 16 17
```

### gh-milestone.sh
Milestone operations via GitHub API. Accepts milestone number OR title pattern.

```bash
~/.claude/scripts/gh-milestone.sh find <title-pattern>
~/.claude/scripts/gh-milestone.sh close <number|title>
~/.claude/scripts/gh-milestone.sh open <number|title>
~/.claude/scripts/gh-milestone.sh rename <number|title> <new-title>
```

Examples:
```bash
~/.claude/scripts/gh-milestone.sh find "Code Quality"
~/.claude/scripts/gh-milestone.sh close 14
~/.claude/scripts/gh-milestone.sh close "Phase 5"           # Find by title, then close
~/.claude/scripts/gh-milestone.sh rename "Phase 5" "[DONE] Phase 5"
```

### gh-milestone-issues.sh
List issues in a milestone with optional filters.

```bash
~/.claude/scripts/gh-milestone-issues.sh <milestone> [state] [label]
```

Arguments:
- `milestone` - Milestone title (required)
- `state` - open, closed, or all (default: all)
- `label` - Filter by label (optional)

Examples:
```bash
~/.claude/scripts/gh-milestone-issues.sh "[READY] Phase 5: Variety Tracking"
~/.claude/scripts/gh-milestone-issues.sh "[ACTIVE] Phase 5" open
~/.claude/scripts/gh-milestone-issues.sh "[ACTIVE] Phase 5" all code-complete
~/.claude/scripts/gh-milestone-issues.sh "[ACTIVE] Phase 5" open pr-review
```

### extract-issue-numbers.sh
Extract issue numbers from text (PR bodies, issue descriptions, etc).

```bash
~/.claude/scripts/extract-issue-numbers.sh <text>
echo "text" | ~/.claude/scripts/extract-issue-numbers.sh
```

Examples:
```bash
~/.claude/scripts/extract-issue-numbers.sh "Fixes #12, #13, and #14"
gh pr view 42 --json body -q .body | ~/.claude/scripts/extract-issue-numbers.sh
gh issue view 15 --json body -q .body | ~/.claude/scripts/extract-issue-numbers.sh
```

### check-docs.sh
Check if standard documentation files exist.

```bash
~/.claude/scripts/check-docs.sh [directory]
```

Checks for: CLAUDE.md, README.md, STATUS.md, DECISIONS.md, GOTCHAS.md
