---
name: create-milestone
description: Create a GitHub milestone from an idea or plan
user_invocable: true
arguments: "[title]"
---

# Create Milestone

Create a GitHub milestone for tracking a body of work.

## Usage

```
/create-milestone                           # Interactive - prompts for details
/create-milestone "Phase 5: Variety Tracking"  # With title
```

## Milestone Types

| Status Prefix | When to Use | Has Issues |
|---------------|-------------|------------|
| `[IDEA]` | Rough idea, needs design session | No |
| `[DESIGNED]` | Design doc complete, needs implementation plan | No |
| `[PLANNED]` | Implementation plan done, issues created | Yes |
| `[ACTIVE]` | Work in progress | Yes |

## Interactive Flow

1. **Get title:** Ask for milestone name if not provided
2. **Determine status:**
   - "Do you have a design doc?" → If no, `[IDEA]`
   - "Do you have an implementation plan with tasks?" → If no, `[DESIGNED]`
   - If yes to both, `[PLANNED]`
3. **Get details:**
   - Overview (2-3 sentences)
   - Design doc link (if exists)
   - Branch name
   - Dependencies (requires/unlocks)
4. **Create issues:** If `[PLANNED]`, prompt to create issues from plan

## Description Template

```markdown
## Overview
[What this delivers]

## Design
[Link to design doc] or "Needs design session"

## Branch
`feature/branch-name`

## Dependencies
- Requires: [Previous milestone or "None"]
- Unlocks: [Next milestone or "None"]

## Issues
[List of issues or "To be created after planning"]
```

## Execution

```bash
# Create milestone
gh api repos/:owner/:repo/milestones -X POST \
  -f title="[STATUS] Milestone Title" \
  -f description="$DESCRIPTION"

# If creating issues, create each and link to milestone
gh issue create --title "Task title" --body "Description" --milestone "Milestone Title" --label "feature"
```

## Naming Conventions

| Type | Format | Example |
|------|--------|---------|
| Sequential phases | `[STATUS] Phase N: Name` | `[PLANNED] Phase 5: Variety Tracking` |
| Independent work | `[STATUS] Category: Name` | `[IDEA] Infra: CI/CD Pipeline` |
| Testing work | `[STATUS] Testing: Name` | `[DESIGNED] Testing: Playwright E2E` |
