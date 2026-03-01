---
name: create-issue
description: Create GitHub issues — quick one-offs or full planned features
user_invocable: true
argument-hint: "[title] (--plan) (--milestone \"name\")"
---

# Create Issue

Create standalone GitHub issues with proper templates, or go through the full brainstorming → design → plan workflow for complex features.

## Usage

```
/create-issue                                      # Interactive - prompts for details
/create-issue "Fix the login bug"                  # Quick with title
/create-issue --plan "Add variety tracking"         # Full planning workflow
/create-issue --milestone "Phase 5" "Fix bug"       # Explicit milestone
```

## Argument Parsing

- Quoted string (not after a flag): Issue title (optional, prompts if missing)
- `--plan` flag: Full mode — brainstorming → design doc → implementation plan → issues
- `--milestone "name"`: Override auto-detected milestone

## Mode Detection

- `--plan` flag present → Full mode
- Otherwise → Quick mode

## Milestone Auto-Detection

Determine which milestone to file the issue under:

1. If `--milestone "name"` provided → use that (verify it exists via `gh_milestone(action="find")`)
2. Get current branch via `mcp__workflow__git_state()`
3. If on `master` → default to `Backlog`
4. If on feature branch → list open milestones, match `## Branch` section in description to current branch
5. If match found → use that milestone. No match → `Backlog`

**Creating Backlog if missing:**
```
mcp__workflow__gh_milestone(action="find", identifier="Backlog")
# If not found:
mcp__workflow__gh_milestone(action="create", title="Backlog")
```

## Quick Mode (default)

### Step 1: Gather Details

If title not provided as argument, ask the user. Then gather:
- **Summary** (1-2 sentences of context)
- **Acceptance criteria** (checklist items)
- **Dependencies** (blocks/blocked-by other issues, if any)
- **Manual flag** (is this a task requiring human interaction?)

Use `AskUserQuestion` if needed, but keep it lightweight — don't over-prompt for simple issues.

### Step 2: Check for Duplicates

Search for potential duplicates by title keywords:

```
mcp__workflow__gh_issue(action="list", labels=[], state="open")
```

If similar titles found, warn the user and ask whether to proceed.

### Step 3: Get Base Commit

Get the current commit hash to stamp on the issue:
```bash
git rev-parse --short HEAD
```

### Step 4: Create Issue

**Preferred: MCP**
**Read `~/.claude/shared/issue-body-template.md`** for the issue body template. Include `## Base Commit` with the hash from Step 3. For quick issues, omit the `## Task Spec` section (no implementation plan exists).

```
mcp__workflow__gh_bulk_issues(
    action="create",
    milestone="Backlog",
    new_issues=[{
        "title": "Issue title",
        "body": "## Summary\n[What this accomplishes]\n\n## Milestone\n[Milestone Name](../../milestone/N)\n\n## Acceptance Criteria\n- [ ] Criterion 1\n- [ ] Criterion 2",
        "labels": []
    }]
)
```

**Fallback: Bash**
```bash
gh issue create --title "Issue title" --body "..." --milestone "Backlog"
```

### Step 5: Update Bidirectional Dependencies

If the issue has dependencies on existing issues, update those issues to add "Blocks: #N" references:

```
# Read existing issue body
mcp__workflow__gh_issue(action="view", issue=42)

# Update with new "Blocks" reference
mcp__workflow__gh_update_issue(issue=42, body="$UPDATED_BODY_WITH_BLOCKS_REF")
```

### Step 5: Output

```
## Issue Created

| # | Title | Milestone |
|---|-------|-----------|
| #123 | Fix the login bug | Backlog |

Dependencies: None
```

## Full Mode (`--plan`)

For complex features that need design exploration before implementation.

### Step 1: Gather Context

Get feature name from argument or ask. Gather brief context about what the user wants to achieve.

### Step 2: Brainstorm

Invoke `superpowers:brainstorming` to explore the problem space and create a design doc.

### Step 2.5: Review Design Doc

Invoke `plannotator:plannotator-annotate` with the path to the design doc produced by brainstorming. This opens an interactive annotation UI where the user can review, mark up, and refine the design before proceeding to implementation planning.

Address any annotation feedback before continuing.

### Step 3: Create Implementation Plan

Invoke `superpowers:writing-plans` to create a detailed implementation plan from the design.

### Step 4: Save Plan Files

Write to `docs/plans/YYYY-MM-DD-<feature>/` following the plan folder structure in `~/.claude/shared/plan-folder-structure.md`.

### Step 5: Create Issues from Plan

Create GitHub issues using the issue body template from `~/.claude/shared/issue-body-template.md`. Include `## Base Commit` (from `git rev-parse --short HEAD`) and `## Task Spec` with a clickable link to each task file. Use `blocked_by_indices` for dependencies (do not add a `## Dependencies` section — the tool handles that).

```
mcp__workflow__gh_bulk_issues(
    action="create",
    milestone="Milestone Name",
    new_issues=[
        {
            "title": "Task 1: Root task",
            "body": "## Summary\n...\n\n## Milestone\n[Name](../../milestone/N)\n\n## Acceptance Criteria\n- [ ] ...\n\n## Task Spec\n[`tasks/01-root-task.md`](https://github.com/{OWNER}/{REPO}/blob/{BRANCH}/docs/plans/{PLAN_FOLDER}/tasks/01-root-task.md)",
            "labels": ["feature"],
            "blocked_by_indices": []
        },
        {
            "title": "Task 2: Depends on Task 1",
            "body": "## Summary\n...\n\n## Milestone\n[Name](../../milestone/N)\n\n## Acceptance Criteria\n- [ ] ...\n\n## Task Spec\n[`tasks/02-depends-on-task-1.md`](https://github.com/{OWNER}/{REPO}/blob/{BRANCH}/docs/plans/{PLAN_FOLDER}/tasks/02-depends-on-task-1.md)",
            "labels": ["feature"],
            "blocked_by_indices": [0]
        }
    ]
)
```

### Step 6: Add Bidirectional Dependencies

Go back and update root/parent issues to add "Blocks" references for newly created dependent issues. Same pattern as create-milestone.

### Step 7: Output

```
## Feature Planned and Issues Created

**Plan:** `docs/plans/YYYY-MM-DD-<feature>/`
**Milestone:** [Name](../../milestone/N)

### Issues
| # | Title | Depends On |
|---|-------|------------|
| #50 | Task 1: Root task | - |
| #51 | Task 2: Depends on Task 1 | #50 |
| #52 | Task 3: Depends on Task 1 | #50 |

### Dependency Graph
```
#50 Root task
├── #51 Task 2
└── #52 Task 3
```

### Next Steps
Run `/create-milestone` to set up the milestone, or `/start-milestone` if milestone already exists.
```

## Issue Body Template

**Read `~/.claude/shared/issue-body-template.md`** for the canonical template with all variables and rules.

Key points:
- No `## Dependencies` section (handled by `blocked_by_indices` / `blocked_by_issues` in `gh_bulk_issues`)
- `## Task Spec` (not "Design Reference") — only include when an implementation plan exists
- For quick issues, omit `## Task Spec` entirely

## Execution

**Preferred: MCP**
```
# Auto-detect milestone
mcp__workflow__git_state()
mcp__workflow__gh_milestone(action="list")

# Check for Backlog
mcp__workflow__gh_milestone(action="find", identifier="Backlog")

# Create issue(s)
mcp__workflow__gh_bulk_issues(action="create", milestone="Backlog", new_issues=[...])

# Update bidirectional dependencies
mcp__workflow__gh_issue(action="view", issue=42)
mcp__workflow__gh_update_issue(issue=42, body="$UPDATED_BODY")
```

**Fallback: Bash**
```bash
# Auto-detect milestone
git branch --show-current
gh api repos/{owner}/{repo}/milestones --jq '.[].title'

# Create issue
gh issue create --title "Title" --body "..." --milestone "Backlog"

# Update dependencies
gh issue view 42 --json body --jq '.body'
gh issue edit 42 --body "..."
```

## Checklist

**CRITICAL: Follow this checklist in order. Execute all steps automatically without asking for confirmation between steps.**

### Mode Detection
- [ ] Parse arguments: title, `--plan` flag, `--milestone` flag
- [ ] Determine mode: `--plan` → Full mode, otherwise → Quick mode

### Milestone Resolution
- [ ] If `--milestone` provided → verify it exists
- [ ] Otherwise → auto-detect from branch (see Milestone Auto-Detection)
- [ ] Create `Backlog` milestone if needed and targeting Backlog

### Quick Mode
- [ ] Get title (from arg or ask user)
- [ ] Get summary, acceptance criteria, dependencies
- [ ] Check for duplicate titles — warn if found
- [ ] **Get base commit hash** via `git rev-parse --short HEAD`
- [ ] Create issue via `gh_bulk_issues(action="create")` with milestone — include `## Base Commit` in body
- [ ] Update bidirectional dependencies on linked issues
- [ ] Output issue number, title, milestone, URL

### Full Mode
- [ ] Get feature name and context
- [ ] Invoke `superpowers:brainstorming`
- [ ] Invoke `plannotator:plannotator-annotate` on the design doc — address feedback before continuing
- [ ] Invoke `superpowers:writing-plans`
- [ ] Save plan to `docs/plans/YYYY-MM-DD-<feature>/` (design.md, summary.md, tasks/*.md)
- [ ] **Get base commit hash** via `git rev-parse --short HEAD`
- [ ] Create issues from plan via `gh_bulk_issues(action="create")` with milestone — include `## Base Commit` in body
- [ ] Add bidirectional dependency links (update parent issues with "Blocks" refs)
- [ ] Output issue table + dependency graph + next steps
