# Manual Tasks in Milestones — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `manual` label support to the milestone workflow so human-interactive tasks are skipped during automated execution, surfaced at the end with an interactive assist loop, and gated at merge time.

**Architecture:** Five skill files get targeted edits. No new files. The `manual` label acts as a skip marker during phase dispatch, and the orchestrator adds an interactive loop after automated phases complete. Merge is hard-blocked on open manual issues.

**Tech Stack:** Markdown skill files (no code — this is a skill/prompt change)

---

### Task 1: Update `start-milestone/SKILL.md` — Labels and Phase Dispatch

**Files:**
- Modify: `skills/start-milestone/SKILL.md:109-121` (GitHub Labels table)
- Modify: `skills/start-milestone/SKILL.md:198-229` (Execution Model / Phase Execution)
- Modify: `skills/start-milestone/SKILL.md:296-330` (Resume & Crash Recovery)

**Step 1: Add `manual` label to the Labels table**

At `skills/start-milestone/SKILL.md:109-121`, add `manual` to the table:

```markdown
## GitHub Labels

| Label | Meaning | Set By |
|-------|---------|--------|
| `in-progress` | Agent is working on implementation | Agent (start) |
| `ready-for-review` | Agent done, tests pass, awaiting review & commit | Agent (end) |
| `code-complete` | Orchestrator committed, issue closed | Orchestrator |
| `blocked-failed` | Failed after retry, skipped | Agent/Orchestrator |
| `manual` | Requires human interaction, skipped by agents | Plan author / Agent (fallback) |
| `pr-review` | Issue created from PR code review findings | create-pr |

**Flow:** `(none) → in-progress → ready-for-review → code-complete (closed)`
**Failure:** `in-progress → blocked-failed`
**Manual:** `manual` (skipped during automated execution, handled interactively after)
```

**Step 2: Add skip rule to phase dispatch**

In the "Execution Model" section (~line 219), after "**Per phase:**" step 1 (Implementation), add a filtering rule. Find this text:

```
1. **Implementation** — Dispatch parallel agents (max 3). Each: implement → test → self-review → mark `ready-for-review`. Agents do NOT commit.
```

Replace with:

```
1. **Implementation** — Filter out issues labeled `manual` (they are skipped entirely). Dispatch parallel agents (max 3) for remaining issues. Each: implement → test → self-review → mark `ready-for-review`. Agents do NOT commit.
```

**Step 3: Add `manual` to resume state table**

In the Resume & Crash Recovery section (~line 320), add a row to the categorization table:

```markdown
| Label | Closed? | Has Commit? | State | Action |
|-------|---------|-------------|-------|--------|
| `code-complete` | Yes | Yes | Done | Skip |
| `code-complete` | Yes | No | Inconsistent | Warn user, verify manually |
| `ready-for-review` | No | No | Review pending | Queue for review → commit |
| `ready-for-review` | No | Yes | Inconsistent | Should be closed, fix labels |
| `in-progress` | No | - | Work incomplete | Dispatch recovery agent |
| `blocked-failed` | No | - | Failed | Skip (or `--retry-failed`) |
| `manual` | No | - | Manual task | Skip (handled in interactive loop) |
| *(none)* | No | - | Not started | Queue for implementation |
```

**Step 4: Verify the edit**

Read back the modified file and confirm:
- `manual` appears in the Labels table
- Phase dispatch mentions filtering `manual` issues
- Resume table has `manual` row

**Step 5: Commit**

```bash
git add skills/start-milestone/SKILL.md
git commit -m "(feat): Add manual label to start-milestone labels and dispatch"
```

---

### Task 2: Update `start-milestone/SKILL.md` — Interactive Loop and Completion

**Files:**
- Modify: `skills/start-milestone/SKILL.md:349-378` (Completion & PR Handoff)
- Modify: `skills/start-milestone/SKILL.md:456-503` (Checklist)

**Step 1: Add Interactive Manual Task Loop section**

After the "Completion & PR Handoff" section (~line 349) and before the "Execution" section, add a new section:

```markdown
## Manual Task Loop

After all automated phases complete, check for open `manual` issues:

```
mcp__workflow__gh_milestone_issues(milestone=5, state="open")
# Filter for issues with "manual" label
```

**If no manual issues remain:** proceed to standard completion (suggest `/create-pr`).

**If manual issues exist:** enter interactive loop in the main session (NOT a subagent).

### Per Manual Issue

1. Present the issue title and `## Manual Task Prompt` section from the issue body
2. Ask the user via `AskUserQuestion`:
   - **"Work on this now"** — Stay in terminal, read full issue, assist interactively. When done, ask if issue should be closed with `code-complete` label.
   - **"Skip for later"** — Move to next manual issue
   - **"Already done"** — Close issue with `code-complete` label via `gh_bulk_issues(action="close", issues=[N], label="code-complete")`

### After Loop

Print summary and suggest `/create-pr`. Always include a reminder about remaining manual issues:

```
All automated issues are complete. Run /create-pr when ready.

Note: The following manual issues are still open:
- #46: Run migration and validate data
- #48: Review enriched dataset

Handle these before or after PR creation — /merge-pr will block until all are closed.
```

If all manual issues were handled, omit the note.

### Multi-Session Resume

When `/start-milestone` is re-run and all automated issues are `code-complete`:
- Skip straight to the manual task loop
- Issue bodies (Manual Task Prompt) are the source of truth — no session state needed
```

**Step 2: Update Completion section**

Replace the existing "Happy Path" message at ~line 358:

```markdown
### Happy Path (All `code-complete`, no `manual` remaining)

```
All 12 issues complete. Ready for PR. Run /create-pr when ready.
```

### Happy Path with Open Manual Issues

```
All automated issues are complete (10/12). Run /create-pr when ready.

Note: The following manual issues are still open:
- #46: Run migration and validate data
- #48: Review enriched dataset

Handle these before or after PR creation — /merge-pr will block until all are closed.
```
```

**Step 3: Update the Checklist**

Add manual task items to the Completion section of the checklist (~line 500):

```markdown
### Completion
- [ ] Verify all non-manual issues are code-complete or blocked-failed
- [ ] Check for open `manual` issues in milestone
- [ ] If manual issues exist: enter interactive manual task loop (see Manual Task Loop section)
- [ ] On success: inform user to run `/create-pr` when ready (do NOT auto-invoke)
- [ ] **Include reminder about open manual issues** in the `/create-pr` suggestion
- [ ] On partial failure: show summary and options
```

**Step 4: Verify the edit**

Read back and confirm:
- "Manual Task Loop" section exists with the interactive flow
- Completion section mentions manual issues
- Checklist has manual task items

**Step 5: Commit**

```bash
git add skills/start-milestone/SKILL.md
git commit -m "(feat): Add interactive manual task loop to start-milestone"
```

---

### Task 3: Update `start-milestone/implementer-prompt.md` — Manual Fallback Detection

**Files:**
- Modify: `skills/start-milestone/implementer-prompt.md:103-114` (after "If you cannot complete the issue" paragraph)

**Step 1: Add manual detection instructions**

Find this text in the prompt template (~line 104):

```
    If you cannot complete the issue, leave it with `in-progress` label and report what's blocking you.
```

Replace with:

```
    If you cannot complete the issue:

    **If the task inherently requires human interaction** (running commands on external systems, iterative data validation, manual testing that can't be scripted):
    - Label the issue `manual` instead of leaving `in-progress`:
      ```
      mcp__workflow__gh_update_issue(issue=N, remove_labels=["in-progress"], add_labels=["manual"])
      ```
    - Report: "Issue #N requires manual intervention: [specific reason]"
    - Do NOT label `blocked-failed` — that's for unexpected blockers (infra issues, missing deps)

    **If it's an unexpected blocker** (missing dependency, infra issue, failing external service):
    - Leave with `in-progress` label and report what's blocking you
```

**Step 2: Verify the edit**

Read back the modified file and confirm the manual detection instructions appear correctly.

**Step 3: Commit**

```bash
git add skills/start-milestone/implementer-prompt.md
git commit -m "(feat): Add manual task fallback detection to implementer prompt"
```

---

### Task 4: Update `merge-pr/SKILL.md` — Hard Block on Open Manual Issues

**Files:**
- Modify: `skills/merge-pr/SKILL.md:62-66` (Pre-merge checklist)
- Modify: `skills/merge-pr/SKILL.md:86-98` (What This Does section)

**Step 1: Add manual issue check to pre-merge checklist**

Find the pre-merge checklist (~line 63):

```markdown
### Pre-merge (requires user confirmation)
- [ ] Show summary: PR title, URL, linked issues, milestone
- [ ] **Get explicit user confirmation** before proceeding
```

Replace with:

```markdown
### Pre-merge (requires user confirmation)
- [ ] Show summary: PR title, URL, linked issues, milestone
- [ ] **Check for open `manual` issues in the milestone**
  - Fetch milestone issues: `mcp__workflow__gh_milestone_issues(milestone=N, state="open")`
  - If any open issues have the `manual` label → **HARD BLOCK**: refuse to merge, list the open manual issues, and instruct the user to complete them first
- [ ] **Get explicit user confirmation** before proceeding
```

**Step 2: Add manual check to "What This Does" section**

Find the confirmation section (~line 89), and add to the summary block:

After the line `- What cleanup will happen`, add:

```markdown
   - **Open manual issues** (if any — BLOCKS merge)
```

**Step 3: Update the confirmation prompt template**

Find the confirmation prompt template (~line 199). After the `**Post-merge cleanup:**` list, add a conditional section:

```markdown
**Manual issues (if any open):**
⛔ Cannot merge — the following manual issues are still open:
- #46: Run migration and validate data
- #48: Review enriched dataset

Complete these issues first, then retry /merge-pr.
```

**Step 4: Verify the edit**

Read back and confirm:
- Pre-merge checklist has manual issue check
- Confirmation prompt shows manual issue block

**Step 5: Commit**

```bash
git add skills/merge-pr/SKILL.md
git commit -m "(feat): Add hard block on open manual issues in merge-pr"
```

---

### Task 5: Update `writing-implementation-tasks/SKILL.md` — Prep Issue Decomposition

**Files:**
- Modify: `skills/writing-implementation-tasks/SKILL.md:86-98` (Step 4: Split tasks)

**Step 1: Add manual task decomposition rule**

After Step 4's content about splitting tasks (~line 91), before Step 5, add:

```markdown
### Manual Task Decomposition

When splitting tasks, apply this rule:

> **If a task requires human interaction** (running migrations on real data, interactive terminal validation, manual testing on external systems), label it `manual` and extract any automatable prep work into a separate preceding task.

**Example decomposition:**
- Original task: "Migrate production data and validate results"
- Split into:
  - Task 03: "Write data migration script" (automatable, no `manual` label)
  - Task 04: "Run migration and validate data" (`manual` label, depends on 03)

**In the task file for manual tasks**, include a `## Manual Task Prompt` section:

```markdown
## Manual Task Prompt

**Context:** [What this task is about, what prep was done in prior tasks]
**Steps:**
1. [Step-by-step what the human needs to do]
2. [Including what to verify/validate]

**Success criteria:**
- [ ] [Checkable items]

**Resources:**
- Script: `scripts/migrate-data.sh` (from Task 03)
- Data source: [API endpoint or DB info]
```

**In the summary.md task table**, mark manual tasks:

```markdown
| # | Name | Depends | Key Files | Manual |
|---|------|---------|-----------|--------|
| 03 | Migration script | 01, 02 | scripts/migrate.sh | No |
| 04 | Run migration | 03 | - | Yes |
```
```

**Step 2: Verify the edit**

Read back and confirm the manual task decomposition rule appears.

**Step 3: Commit**

```bash
git add skills/writing-implementation-tasks/SKILL.md
git commit -m "(feat): Add manual task decomposition rule to writing-implementation-tasks"
```

---

### Task 6: Update `create-issue/SKILL.md` and `create-milestone/SKILL.md` — Manual Label Support

**Files:**
- Modify: `skills/create-issue/SKILL.md:80-93` (Step 4: Create Issue)
- Modify: `skills/create-milestone/SKILL.md:180-197` (gh_bulk_issues example)
- Modify: `skills/shared/issue-body-template.md` (add Manual Task Prompt section)

**Step 1: Update issue body template**

Add the optional `## Manual Task Prompt` section to `skills/shared/issue-body-template.md`. After the `## Task Spec` section:

```markdown
## Manual Task Prompt
**Context:** {MANUAL_CONTEXT}
**Steps:**
1. {MANUAL_STEP_1}
2. {MANUAL_STEP_2}

**Success criteria:**
- [ ] {MANUAL_CRITERION_1}

**Resources:**
- {MANUAL_RESOURCE_1}
```

Add to the Variables table:

```markdown
| `{MANUAL_CONTEXT}` | Context for the human performing the task | "Migration script from #45 is ready" |
| `{MANUAL_STEP_N}` | Steps the human needs to follow | "Run `./scripts/migrate.sh` on prod" |
| `{MANUAL_CRITERION_N}` | Success criteria for the manual task | "All records migrated without errors" |
| `{MANUAL_RESOURCE_N}` | Scripts, endpoints, or tools needed | "Script: `scripts/migrate.sh` (from #45)" |
```

Add to the Rules section:

```markdown
6. **`## Manual Task Prompt` is optional.** Only include for issues labeled `manual`. Omit for all automatable issues.
```

**Step 2: Update create-issue to mention manual label**

In `skills/create-issue/SKILL.md`, in the Quick Mode Step 1 (Gather Details, ~line 53), add:

After "Dependencies (blocks/blocked-by other issues, if any)", add:
```markdown
- **Manual flag** (is this a task requiring human interaction?)
```

In the `gh_bulk_issues` example (~line 83), update the labels array comment:

```markdown
        "labels": []  # Add "manual" if task requires human interaction
```

**Step 3: Update create-milestone to mention manual label**

In `skills/create-milestone/SKILL.md`, in the `gh_bulk_issues` example (~line 188), add a comment about the manual label:

```markdown
        {
            "title": "Task 3: Manual validation",
            "body": "## Summary\n...\n\n## Acceptance Criteria\n- [ ] ...\n\n## Manual Task Prompt\n...",
            "labels": ["manual"],
            "blocked_by_indices": [1]  # Depends on automatable prep task
        }
```

**Step 4: Verify the edits**

Read back all three files and confirm manual label support appears.

**Step 5: Commit**

```bash
git add skills/create-issue/SKILL.md skills/create-milestone/SKILL.md skills/shared/issue-body-template.md
git commit -m "(feat): Add manual label support to issue creation skills and template"
```

---

### Task 7: Update `create-pr/SKILL.md` — Warn About Open Manual Issues

**Files:**
- Modify: `skills/create-pr/SKILL.md` (pre-flight checks section)

**Step 1: Add manual issue warning**

In the pre-flight checks section of `create-pr/SKILL.md`, after the branch/working state verification, add:

```markdown
### 3. Check for Open Manual Issues

```
# Get milestone for this branch
mcp__workflow__gh_milestone(action="list")
# Parse milestone descriptions for ## Branch matching current branch

# Check for open manual issues
mcp__workflow__gh_milestone_issues(milestone=N, state="open")
# Filter for "manual" label
```

If open manual issues exist, **warn but proceed**:

```
⚠️  Open manual issues in this milestone:
- #46: Run migration and validate data
- #48: Review enriched dataset

These won't block PR creation, but /merge-pr will block until they're closed.
Proceeding with PR creation...
```
```

**Step 2: Verify the edit**

Read back and confirm the warning appears in pre-flight checks.

**Step 3: Commit**

```bash
git add skills/create-pr/SKILL.md
git commit -m "(feat): Add manual issue warning to create-pr pre-flight checks"
```
