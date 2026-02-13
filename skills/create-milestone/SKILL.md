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
   - Task spec link (if implementation plan exists)
   - **`blocked_by_indices`** to declare dependencies (tool adds blocker lines automatically)
   - **`--milestone` flag** to link the issue to the milestone (REQUIRED)
4. **Post-process bidirectional links** — add "Blocks" references to parent issues (see below)
5. **Update milestone description** with:
   - Link to implementation plan
   - Full issue list with dependencies
   - Dependency graph (ASCII tree)
6. **Change status** to `[READY]`

## Issue Dependencies

**Critical:** Every issue must have bidirectional dependency links so you can navigate the graph from any issue.

### How Dependencies Work

1. **"Blocked by" lines** are added automatically by `gh_bulk_issues` when you use `blocked_by_indices` or `blocked_by_issues`. The tool creates a `## Dependencies` section with blocker lines.
2. **"Blocks" lines** must be added as a post-processing step. After all issues are created, go back and edit parent issues to add "Blocks: #X" references.

### Issue Body Template

See `skills/shared/issue-body-template.md` for the canonical issue body template with all variables documented.

**Key rules:**
- **No `## Dependencies` section in the body.** Dependencies are handled by `blocked_by_indices` / `blocked_by_issues` in `gh_bulk_issues`. The tool adds blocker lines automatically.
- **`## Task Spec`** (not "Design Reference") links to the specific task file with a clickable GitHub URL. Optional — omit when no implementation plan exists.
- **`## Milestone`** uses relative path `../../milestone/N` which works from any issue page.

### Example: Bidirectional Links

For this dependency chain: `#3 → #4 → #6`

After `gh_bulk_issues` creates all issues, the tool automatically adds "Blocked by" lines. You then post-process to add "Blocks" lines:

**Issue #3 (root) — after post-processing, add Dependencies section:**
```markdown
## Acceptance Criteria
- [ ] ...

## Dependencies
- Blocks: #4 (Retry endpoint), #5 (Stats endpoint)
```

**Issue #4 — tool already added "Blocked by", append "Blocks" line:**
```markdown
## Dependencies
- Blocked by: #3 Settings schema
- Blocks: #6 (Widget component)
```

**Issue #6 (leaf) — tool already added "Blocked by", no changes needed:**
```markdown
## Dependencies
- Blocked by: #4 Retry endpoint
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
# NOTE: Do NOT include ## Dependencies in body — the tool adds blocker lines automatically
mcp__workflow__gh_bulk_issues(
    action="create",
    milestone="[STATUS] #5 Milestone Title",
    new_issues=[
        {
            "title": "Task 1: Root task",
            "body": "## Summary\n...\n\n## Acceptance Criteria\n- [ ] ...",
            "labels": ["feature"]
        },
        {
            "title": "Task 2: Depends on Task 1",
            "body": "## Summary\n...\n\n## Acceptance Criteria\n- [ ] ...",
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
- [ ] Use `blocked_by_indices` to declare dependencies (tool adds `## Dependencies` with blocker lines automatically)
- [ ] Add `## Milestone` section with clickable link `[Title](../../milestone/N)`
- [ ] Add `## Task Spec` section with clickable GitHub link (if implementation plan exists)
- [ ] **Post-process bidirectional links** — edit parent issues to add "Blocks: #X" (create `## Dependencies` section for root tasks that don't have one yet)
- [ ] Update milestone description with implementation plan link, issue list, and dependency graph
- [ ] Change milestone status prefix to `[READY]`
- [ ] Verify all issues appear in milestone's issue list (not just referenced in text)

### Execution Order for Bidirectional Links

Since you can't know issue numbers until they're created:

1. **Create all issues** via `gh_bulk_issues` with `blocked_by_indices` — tool auto-adds "Blocked by" lines in a `## Dependencies` section
2. **Post-process parent issues** to add "Blocks" references:
   - **If `## Dependencies` exists** (issue has blockers): append `- Blocks: #X (Title)` line to the existing section
   - **If `## Dependencies` doesn't exist** (root tasks with no blockers): create a new `## Dependencies` section with the `- Blocks: #X (Title)` line, placed after `## Acceptance Criteria`
3. **Update milestone description** with complete dependency graph
