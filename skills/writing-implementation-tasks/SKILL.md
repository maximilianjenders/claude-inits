---
name: writing-implementation-tasks
description: Create implementation plans with one-file-per-task structure for context-efficient agent consumption
user_invocable: true
argument-hint: "[feature name]"
---

# Writing Implementation Tasks

Create a detailed implementation plan using `superpowers:writing-plans` for generation quality, then restructure the output into individual task files for context-efficient consumption by `/start-milestone` agents.

## Output Structure

**Read `./skills/shared/plan-folder-structure.md`** (relative to project root) for the canonical folder layout and file naming conventions.

**What each file contains in this skill's output:**

| File | Contents |
|------|----------|
| `design.md` | Design doc copied from a prior brainstorming session (skip if none exists) |
| `summary.md` | Implementation tracking: task table, dependency graph, architectural notes |
| `tasks/NN-short-name.md` | Self-contained task (~250 lines) with full code examples and TDD steps |

## Phase 1: Generate Detailed Plan

**REQUIRED SUB-SKILL:** Use `superpowers:writing-plans` to generate the full implementation plan.

Pass through the feature name/description from the user. Let writing-plans do its full process — brainstorming, design exploration, and detailed task breakdown with code examples and TDD steps.

When writing-plans finishes and presents its output (a single large document), proceed to Phase 2. Do NOT follow writing-plans' execution options — you will handle the output yourself.

## Phase 2: Restructure into Task Files

Take the writing-plans output and split it into the folder structure above.

### Step 1: Create the plan folder

```
docs/plans/YYYY-MM-DD-<feature>/
```

Use today's date and a short kebab-case feature name (e.g., `2025-06-15-variety-tracking`).

### Step 2: Handle the design doc

If a design doc already exists for this feature (e.g., from a prior `brainstorming` session):
- Copy it into the plan folder as `design.md`
- Ask the user for the path if you're unsure whether one exists

If no design doc exists, skip this file.

### Step 3: Write summary.md

Extract from the writing-plans output:

```markdown
# [Feature Name] Implementation

**Goal:** [One sentence from the plan overview]

**Architecture:** [2-3 sentences summarizing the approach]

## Tasks

| # | Name | Depends | Key Files |
|---|------|---------|-----------|
| 01 | Short name | - | models/foo.py, tests/test_foo.py |
| 02 | Short name | 01 | api/foo.py, tests/test_api_foo.py |
| 03 | Short name | 01, 02 | services/bar.py |

## Dependency Graph

```
#01 Model name (ROOT)
├── #02 API endpoint
│   └── #04 Frontend component
└── #03 Service layer
```

## Notes

[Any cross-cutting concerns, open questions, or architectural notes from the plan]
```

### Step 4: Split tasks into individual files

For each `### Task N:` section in the writing-plans output, create `tasks/NN-short-name.md`.

Keep the FULL detail from writing-plans — code examples, TDD steps, verification commands. The whole point is that each file is self-contained (~250 lines) so an agent can load just the task it needs without consuming the entire plan.

File naming: `NN-short-name.md` where NN is zero-padded (01, 02, ...) and short-name is kebab-case (e.g., `01-ingredient-model.md`, `02-api-endpoint.md`).

### Step 5: Verify completeness

- Count tasks in summary table matches number of task files created
- Every dependency reference in task files points to an existing task
- No content from writing-plans was lost in the split

## Completion Output

After saving all files:

```
Plan saved to: docs/plans/YYYY-MM-DD-<feature>/

  summary.md          - Overview + dependency graph
  tasks/01-name.md    - [Brief description]
  tasks/02-name.md    - [Brief description]
  ...

Next: Run /create-milestone to create GitHub issues from these tasks.
```

Then immediately offer to run `/create-milestone` to create the GitHub issues.
