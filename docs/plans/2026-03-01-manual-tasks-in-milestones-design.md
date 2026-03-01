# Manual Task Support in Milestone Workflow

## Problem

The milestone execution workflow treats all issues as fully automatable. When a milestone contains tasks that require human interaction (running migrations, validating data, iterative terminal work), these tasks are either:
- Glossed over — a script is written but never executed
- Silently fall through as `blocked-failed`
- Not surfaced when the orchestrator suggests `/create-pr`

The user discovers open manual issues only after the PR is created or at merge time.

## Design

### New GitHub Label: `manual`

A `manual` label identifies issues requiring human interaction. Applied in two ways:

1. **At issue creation** — plan-writing and issue-creation skills recognize manual tasks and label them
2. **At runtime (fallback)** — if an implementation agent determines it cannot fully automate an issue, it labels it `manual` instead of `blocked-failed`

Semantic distinction:

| Label | Meaning |
|-------|---------|
| `blocked-failed` | Agent tried, hit unexpected blocker (infra issue, missing dep) |
| `manual` | Task inherently requires human judgment/interaction |

### Plan-Writing: Prep Issue Decomposition

When `writing-implementation-tasks` creates issues for a milestone:

> If a task requires human interaction (`manual` label), extract any automatable prep work into a separate issue that the manual issue depends on.

Example:
- Issue #45: "Write data migration script" (automatable, phase 1)
- Issue #46: "Run migration and validate data" (`manual`, phase 2, `Blocked by: #45`)

This ensures scripts, utilities, and documentation are committed before the interactive session.

### Manual Task Prompt in Issue Body

Manual issues must include a structured prompt section:

```markdown
## Manual Task Prompt

**Context:** [What this task is about, what prep was done in prior issues]
**Steps:**
1. [Step-by-step what needs to happen]
2. [Including what to verify/validate]

**Success criteria:**
- [ ] [Checkable items the user can tick off]

**Resources:**
- Script: `scripts/migrate-data.sh` (from #45)
- Data source: [API endpoint or DB connection info]
```

This section is displayed when the interactive loop presents the issue, and serves as the source of truth across sessions.

### Orchestrator Changes (`start-milestone`)

**During phase dispatch:**
- Issues labeled `manual` are skipped — not dispatched to agents
- They don't count toward phase completion
- They remain open with no label change

**After all automated phases complete:**
- Check for open `manual` issues in the milestone
- If none → suggest `/create-pr` (current behavior)
- If manual issues exist → enter interactive manual task loop, then suggest `/create-pr` with a reminder listing open manual issues

**Suggest `/create-pr` message (when manual issues exist):**
```
All automated issues are complete. Run /create-pr when ready.

Note: The following manual issues are still open:
- #46: Run migration and validate data
- #48: Review enriched dataset

Handle these before or after PR creation — /merge-pr will block until all are closed.
```

### Interactive Manual Task Loop

Runs in the main session (not a subagent). For each open `manual` issue:

1. Present the issue title + Manual Task Prompt section
2. Ask: "Work on this now? / Skip for later? / Already done?"
3. **Work on this now** — assist interactively in the terminal. When done, ask if the issue should be closed with `code-complete` label.
4. **Skip** — move to next issue
5. **Already done** — close the issue with `code-complete` label

After the loop, print summary and suggest `/create-pr`.

### Multi-Session Support

Manual tasks may span multiple sessions. State is tracked via GitHub issues:

- Re-running `/start-milestone <id>` when automated work is done skips straight to the manual task loop
- Each session reads the issue body (Manual Task Prompt) — no session state needed
- Users can close issues manually on GitHub between sessions

### Gates

| Checkpoint | Behavior |
|------------|----------|
| `/create-pr` | **Warn** — list open manual issues as reminder, but proceed |
| `/merge-pr` | **Hard block** — refuse to merge if any `manual` issues are open |

### Implementation Agent Fallback

If an agent dispatched to a non-`manual` issue determines the task requires human interaction:

1. Label the issue `manual` (via `gh_update_issue`)
2. Report back to orchestrator: "Issue #N requires manual intervention: [reason]"
3. Do NOT label `blocked-failed`
4. Orchestrator treats it as a `manual` issue from that point forward

## Changes Required

### Skills to modify:
1. **`writing-implementation-tasks`** — add rule for prep issue decomposition and `manual` label
2. **`start-milestone/SKILL.md`** — skip `manual` issues in dispatch, add interactive loop after automated phases, add reminder to `/create-pr` suggestion
3. **`start-milestone/implementer-prompt.md`** — add instructions for detecting and labeling `manual` tasks
4. **`merge-pr/SKILL.md`** — add hard block on open `manual` issues
5. **`create-issue`** — support `manual` label in issue creation

### New label to create:
- `manual` — on each downstream repo (food-butler, spendee-visualiser)
