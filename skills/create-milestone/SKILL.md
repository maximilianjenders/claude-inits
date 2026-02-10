---
name: create-milestone
description: Create GitHub issues from implementation plans. Use after writing-implementation-tasks completes, or when populating a milestone with issues
user_invocable: true
argument-hint: "[title]"
---

# Create Milestone

Create or update a GitHub milestone for tracking a body of work.

## Usage

```
/create-milestone                           # Interactive - prompts for details
/create-milestone "Phase 5: Variety Tracking"  # With title
```

## Milestone Lifecycle

| Status Prefix | When to Use | Has Issues |
|---------------|-------------|------------|
| `[SKETCH]` | Rough idea, needs design session | No |
| `[SCOPED]` | Design doc complete, needs implementation plan | No |
| `[READY]` | Implementation plan done, issues created | Yes |
| `[ACTIVE]` | Work in progress | Yes |

**Typical progression:** `[SKETCH]` → `[SCOPED]` → `[READY]` → `[ACTIVE]`

## Two Workflows

### Workflow A: Create New Milestone

Use when starting fresh with an idea or design.

1. **Get title:** Ask for milestone name if not provided
2. **Determine status:**
   - "Do you have a design doc?" → If no, `[SKETCH]`
   - "Do you have an implementation plan with tasks?" → If no, `[SCOPED]`
   - If yes to both, proceed to Workflow B
3. **Get details:**
   - Overview (2-3 sentences)
   - Design doc link (if exists)
   - Implementation plan link (if exists)
   - Branch name
   - Dependencies (requires/unlocks)
4. **Create milestone** with placeholder for issues
5. **Add milestone number to title** - immediately update the title to include `#N` for easy reference

### Workflow B: Populate Milestone with Issues

Use when an implementation plan is ready and you need to create issues.

1. **Find existing milestone** or create new one
2. **Read the implementation plan** (design doc task breakdown)
3. **Create issues** with:
   - Clear title
   - Acceptance criteria
   - **Dependencies section** (see below)
   - **`--milestone` flag** to link the issue to the milestone (REQUIRED)
4. **Update milestone description** with:
   - Link to implementation plan
   - Full issue list with dependencies
   - Dependency graph (ASCII tree)
5. **Change status** to `[READY]`

## Issue Dependencies

**Critical:** Every issue must document its dependencies with bidirectional links.

### Dependency Rules

1. **Blocked by:** Issues that must complete before this one can start
2. **Blocks:** Issues that are waiting on this one to complete

Both directions must be documented so you can navigate the graph from any issue.

### Issue Body Template

```markdown
## Summary
[What this task accomplishes]

## Milestone
[Phase X: Title](../../milestone/N)

## Dependencies
- Blocked by: #X (Brief description)
- Blocks: #Y, #Z (Brief descriptions)

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Design Reference
See `docs/plans/YYYY-MM-DD-<feature>/design.md`
```

**Note:** The milestone link uses relative path `../../milestone/N` which works from any issue page.

### Example: Bidirectional Links

For this dependency chain: `#3 → #4 → #6`

**Issue #3 (root):**
```markdown
## Milestone
[Phase 5: Variety Tracking](../../milestone/5)

## Dependencies
- Blocked by: None (root task)
- Blocks: #4 (Retry endpoint), #5 (Stats endpoint)
```

**Issue #4:**
```markdown
## Milestone
[Phase 5: Variety Tracking](../../milestone/5)

## Dependencies
- Blocked by: #3 (Settings schema)
- Blocks: #6 (Widget component)
```

**Issue #6 (leaf):**
```markdown
## Milestone
[Phase 5: Variety Tracking](../../milestone/5)

## Dependencies
- Blocked by: #4 (Retry endpoint)
- Blocks: None (leaf task)
```

### Milestone Description Template (with issues)

```markdown
## Overview
[What this delivers]

## Design
[Link to design doc]

## Implementation Plan
[Link to implementation plan]

## Branch
`feature/branch-name`

## Dependencies
- Requires: [Previous milestone or "None"]
- Unlocks: [Next milestone or "None"]

## Issues

### Backend
1. #3 Settings schema extension
2. #4 Retry endpoint ← depends on #3
3. #5 Stats endpoint ← depends on #3

### Frontend
4. #6 Widget component ← depends on #4
5. #7 Page integration ← depends on #6

## Dependency Graph
```
#3 Settings schema (ROOT)
├── #4 Retry endpoint
│   └── #6 Widget component
│       └── #7 Page integration
└── #5 Stats endpoint
```
```

## Execution

**IMPORTANT:** Always link issues to the milestone. Issues must be linked, not just reference the milestone in text.

**Use MCP tools for all operations:**
```
# Create new milestone
mcp__workflow__gh_milestone(
    action="create",
    title="[STATUS] Milestone Title",
    description="## Overview\n..."
)

# Update milestone title/status
mcp__workflow__gh_milestone(action="rename", identifier="5", new_title="[READY] #5 Milestone Title")

# Update milestone description (e.g., after issues are created)
mcp__workflow__gh_milestone(action="edit", identifier="5", description="## Overview\n...")

# Create issues in bulk with milestone and dependencies
mcp__workflow__gh_bulk_issues(
    action="create",
    milestone="[STATUS] #5 Milestone Title",
    new_issues=[
        {
            "title": "Task 1: Root task",
            "body": "## Summary\n...\n## Dependencies\n- Blocked by: None",
            "labels": ["feature"]
        },
        {
            "title": "Task 2: Depends on Task 1",
            "body": "## Summary\n...\n## Dependencies\n- Blocked by: #X",
            "labels": ["feature"],
            "blocked_by_indices": [0]  # References first issue in this batch
        }
    ]
)

# Update issue body (e.g., to add bidirectional dependency links)
mcp__workflow__gh_update_issue(issue=15, body="$UPDATED_BODY")
```

**IMPORTANT:** Do NOT use `gh api -f description=...` in Bash for milestone descriptions — it corrupts newlines into literal `\n`. Always use the MCP `gh_milestone` tool for create/edit operations.

## Naming Conventions

| Type | Format | Example |
|------|--------|---------|
| Sequential phases | `[STATUS] #N Phase X: Name` | `[READY] #5 Phase 5: Variety Tracking` |
| Independent work | `[STATUS] #N Category: Name` | `[SKETCH] #3 Infra: CI/CD Pipeline` |
| Testing work | `[STATUS] #N Testing: Name` | `[SCOPED] #4 Testing: Playwright E2E` |

**Note:** The `#N` is the GitHub milestone number, added after creation for easy reference.

## Checklist

### Workflow Decision (do this first)
- [ ] **Determine which workflow applies:**
  - No design doc? → Workflow A, status `[SKETCH]`
  - Design doc but no implementation plan? → Workflow A, status `[SCOPED]`
  - Design doc AND implementation plan ready? → Workflow B, status `[READY]`

### Workflow A: Create New Milestone
- [ ] Get milestone title (ask if not provided)
- [ ] Determine status prefix based on readiness
- [ ] Gather details: overview, design doc link, implementation plan link, branch name, dependencies
- [ ] Create milestone via `gh_milestone` MCP tool
- [ ] **Immediately update title to include `#N`** (milestone number)
- [ ] If implementation plan exists, proceed to Workflow B

### Workflow B: Populate with Issues

When transitioning from `[SCOPED]` to `[READY]`:

- [ ] Read the design doc's task breakdown
- [ ] Identify the dependency graph (what blocks what)
- [ ] Create issues in dependency order (root tasks first)
- [ ] **Use `gh_bulk_issues` MCP tool with `milestone` parameter** (REQUIRED - issues must be linked)
- [ ] Add `## Milestone` section with clickable link `[Title](../../milestone/N)`
- [ ] Add `## Dependencies` section to each issue body
- [ ] **Add bidirectional links** - go back and update earlier issues with "Blocks: #X" once dependent issues are created
- [ ] Update milestone description with implementation plan link, issue list, and dependency graph
- [ ] Change milestone status prefix to `[READY]`
- [ ] Verify all issues appear in milestone's issue list (not just referenced in text)

### Execution Order for Bidirectional Links

Since you can't link to issues that don't exist yet:

1. Create all issues first (with "Blocked by" filled in)
2. Go back and edit root/parent issues to add "Blocks" references
3. Update milestone description with complete dependency graph
