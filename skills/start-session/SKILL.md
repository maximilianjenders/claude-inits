---
name: start-session
description: Query GitHub for current project state at session start
user_invocable: true
---

# Start Session

Query GitHub Issues/Milestones to understand current project state when starting a new session.

## Usage

```
/start-session
```

## What This Does

1. **Query open milestones** - Show active work streams
2. **Query in-progress issues** - What's currently being worked on
3. **Query pending issues** - What's ready to start
4. **Check current branch** - Are we on a feature branch?
5. **Summarize state** - Present a clear picture of where we are

## Execution

**Preferred: MCP**
```
# Current git state (branch, worktrees, PR status)
mcp__workflow__git_state()

# List all open milestones
mcp__workflow__gh_milestone(action="list", state="open")

# Issues in progress (across all milestones)
mcp__workflow__gh_issue(action="list", labels=["in-progress"], state="open")

# Code-complete issues (closed, ready for PR/merge)
mcp__workflow__gh_issue(action="list", labels=["code-complete"], state="closed")

# For detailed milestone breakdown, query each milestone's issues:
mcp__workflow__gh_milestone_issues(milestone=5, state="all")
```

**Fallback: Bash**
```bash
# Current branch
git branch --show-current

# Open milestones with issue counts
gh api repos/:owner/:repo/milestones --jq '.[] | "\(.title) (\(.open_issues) open, \(.closed_issues) closed)"'

# Issues in progress
gh issue list --label "in-progress" --json number,title,milestone --jq '.[] | "#\(.number) \(.title) [\(.milestone.title // "no milestone")]"'

# Code-complete issues (closed, ready for PR/merge)
gh issue list --state closed --label "code-complete" --json number,title,milestone --jq '.[] | "#\(.number) \(.title) [\(.milestone.title // "no milestone")]"'

# Recent closed issues (last 5)
gh issue list --state closed --limit 5 --json number,title,closedAt --jq '.[] | "#\(.number) \(.title) (closed \(.closedAt | split("T")[0]))"'
```

## Output Format

```
## Current State

**Branch:** feature/phase5-variety-tracking

### Active Milestones
- [ACTIVE] Phase 5: Variety Tracking (1 open, 5 closed)
- [SKETCH] Phase 6: Meal Planning (0 open, 0 closed)

### In Progress
- #15 Add retry suggestions endpoint [Phase 5]

### Code Complete (closed, ready for merge)
- #14 Settings schema extension [Phase 5]

### Merged (no code-complete label)
- #13 Variety stats endpoint (closed 2026-01-28)
- #12 Baby model updates (closed 2026-01-27)

### Suggested Next Steps
1. Review #14 (code-complete) for merge
2. Continue #15 (in-progress)
3. Pick up next pending issue from Phase 5
```

**Status prefixes:** `[SKETCH]`, `[SCOPED]`, `[READY]`, `[ACTIVE]`

## Fallback

If GitHub queries fail (no repo, no access), fall back to:
1. Read `BACKLOG.md` if it exists
3. Show git status and recent commits
