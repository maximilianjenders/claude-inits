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

Run these queries:

```bash
# Current branch
git branch --show-current

# Open milestones with issue counts
gh api repos/:owner/:repo/milestones --jq '.[] | "\(.title) (\(.open_issues) open, \(.closed_issues) closed)"'

# Issues in progress
gh issue list --label "in-progress" --json number,title,milestone --jq '.[] | "#\(.number) \(.title) [\(.milestone.title // "no milestone")]"'

# Code-complete issues (ready for PR/merge)
gh issue list --label "code-complete" --json number,title,milestone --jq '.[] | "#\(.number) \(.title) [\(.milestone.title // "no milestone")]"'

# Recent closed issues (last 5)
gh issue list --state closed --limit 5 --json number,title,closedAt --jq '.[] | "#\(.number) \(.title) (closed \(.closedAt | split("T")[0]))"'
```

## Output Format

```
## Current State

**Branch:** feature/phase5-variety-tracking

### Active Milestones
- [ACTIVE] Phase 5: Variety Tracking (3 open, 2 closed)
- [IDEA] Phase 6: Meal Planning (0 open, 0 closed)

### In Progress
- #15 Add retry suggestions endpoint [Phase 5]

### Code Complete (ready for merge)
- #14 Settings schema extension [Phase 5]

### Recently Completed
- #13 Variety stats endpoint (closed 2026-01-28)
- #12 Baby model updates (closed 2026-01-27)

### Suggested Next Steps
1. Review #14 (code-complete) for merge
2. Continue #15 (in-progress)
3. Pick up next pending issue from Phase 5
```

## Fallback

If GitHub queries fail (no repo, no access), fall back to:
1. Read `STATUS.md` if it exists
2. Read `BACKLOG.md` if it exists
3. Show git status and recent commits
