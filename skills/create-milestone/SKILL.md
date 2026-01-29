---
name: create-milestone
description: Create a GitHub milestone from an idea or plan, or populate an existing milestone with issues
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
   - Branch name
   - Dependencies (requires/unlocks)
4. **Create milestone** with placeholder for issues

### Workflow B: Populate Milestone with Issues

Use when an implementation plan is ready and you need to create issues.

1. **Find existing milestone** or create new one
2. **Read the implementation plan** (design doc task breakdown)
3. **Create issues** with:
   - Clear title
   - Acceptance criteria
   - **Dependencies section** (see below)
4. **Update milestone description** with:
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

## Dependencies
- Blocked by: #X (Brief description)
- Blocks: #Y, #Z (Brief descriptions)

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Design Reference
See `docs/plans/YYYY-MM-DD-design-doc.md`
```

### Example: Bidirectional Links

For this dependency chain: `#3 → #4 → #6`

**Issue #3 (root):**
```markdown
## Dependencies
- Blocked by: None (root task)
- Blocks: #4 (Retry endpoint), #5 (Stats endpoint)
```

**Issue #4:**
```markdown
## Dependencies
- Blocked by: #3 (Settings schema)
- Blocks: #6 (Widget component)
```

**Issue #6 (leaf):**
```markdown
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

```bash
# Create new milestone
gh api repos/:owner/:repo/milestones -X POST \
  -f title="[STATUS] Milestone Title" \
  -f description="$DESCRIPTION"

# Update existing milestone (change status, add issues list)
gh api repos/:owner/:repo/milestones/NUMBER -X PATCH \
  -f title="[NEW_STATUS] Milestone Title" \
  -f description="$UPDATED_DESCRIPTION"

# Create issue with milestone
gh issue create \
  --title "Task title" \
  --body "$BODY_WITH_DEPENDENCIES" \
  --milestone "[STATUS] Milestone Title"

# Update issue to add dependencies after creation
gh issue edit NUMBER --body "$UPDATED_BODY"
```

## Naming Conventions

| Type | Format | Example |
|------|--------|---------|
| Sequential phases | `[STATUS] Phase N: Name` | `[READY] Phase 5: Variety Tracking` |
| Independent work | `[STATUS] Category: Name` | `[SKETCH] Infra: CI/CD Pipeline` |
| Testing work | `[STATUS] Testing: Name` | `[SCOPED] Testing: Playwright E2E` |

## Checklist for Populating Issues

When transitioning from `[SCOPED]` to `[READY]`:

- [ ] Read the design doc's task breakdown
- [ ] Identify the dependency graph (what blocks what)
- [ ] Create issues in dependency order (root tasks first)
- [ ] Add `## Dependencies` section to each issue body
- [ ] **Add bidirectional links** - go back and update earlier issues with "Blocks: #X" once dependent issues are created
- [ ] Update milestone description with issue list and graph
- [ ] Change milestone status prefix to `[READY]`

### Execution Order for Bidirectional Links

Since you can't link to issues that don't exist yet:

1. Create all issues first (with "Blocked by" filled in)
2. Go back and edit root/parent issues to add "Blocks" references
3. Update milestone description with complete dependency graph
