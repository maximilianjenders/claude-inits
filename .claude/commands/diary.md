---
description: Update the development diary with session notes, decisions, and changes
allowed-tools: Read, Edit, Glob, Bash(git diff:*), Bash(git status:*), Bash(git add:*), Bash(git commit:*)
---

# Update Development Diary

You are updating the project's development diary (`DIARY.md`). This diary enables asynchronous collaboration between sessions and preserves context for future work.

## Step 1: Gather Context

First, read the current diary and check for file changes:

1. Read `@DIARY.md` to understand existing decisions and context
2. Run `git status` to see what files changed this session
3. Run `git diff HEAD~1` (or appropriate range) to see recent changes

## Step 2: Analyze the Conversation

Review this conversation and extract:

### New Decisions
- What choices were made?
- What was the reasoning (WHY)?
- What alternatives were considered and rejected?

### Decision Changes
- Did any previous decision get revised or superseded?
- What was the old decision?
- What is the new decision?
- WHY did it change?

### What Worked
- Commands that succeeded
- Configurations that are now working

### What Didn't Work
- Errors encountered
- Workarounds needed

### Open Questions
- What questions remain unresolved?
- What needs to be decided in future sessions?

### Progress
- What was accomplished?
- What files were created or modified?

## Step 3: Update the Diary

### For New Sessions

Append a new dated section following this structure:

```markdown
---

## YYYY-MM-DD: [Brief Session Title]

### Session Summary

[2-3 sentences describing what was accomplished]

### Decisions Made

#### [Decision Number]. [Decision Title]

**Decision:** [What was decided]

**Why:**
- [Reason 1]
- [Reason 2]

**Alternatives Considered:**
- [Alternative 1] - rejected because [reason]
- [Alternative 2] - rejected because [reason]

### What Worked

- [Success 1]
- [Success 2]

### Issues Encountered

- [Issue 1] - `RESOLVED` / `OPEN`
  - What happened: [description]
  - Solution: [if resolved]

### Files Changed

- `path/to/file.ext` - [brief description of change]

---

*Next: [What should happen next session]*
```

### For Decision Changes

When a previous decision is superseded:

1. **DO NOT delete** the original decision
2. Add a `SUPERSEDED` marker to the original:

```markdown
#### 1. Database Choice ~~[SUPERSEDED - see YYYY-MM-DD]~~

**Original Decision:** SQLite

**Why:** [original reasoning]

**Status:** Superseded on YYYY-MM-DD. See [new decision title] below.
```

3. Document the new decision in the current session with a reference:

```markdown
#### [N]. Database Choice (Revised)

**Decision:** PostgreSQL

**Why:** [new reasoning]

**Previous Decision:** SQLite (YYYY-MM-DD)

**Why Changed:**
- [Reason the old decision no longer applies]
- [What new information prompted the change]
```

## Step 4: Commit the Changes

After updating the diary, commit all changes from the session:

1. Stage all changed files: `git add -A`
2. Create a commit following the conventions in `CLAUDE.md`

Choose the commit type based on the primary work done in the session.

## Formatting Rules

### For Human Readers
- Use clear headings and bullet points
- Write in complete sentences for reasoning
- Include enough context to understand without reading the whole history

### For AI Agents
- Use consistent section markers (`###`, `####`)
- Include explicit status markers (`SUPERSEDED`, `RESOLVED`, `OPEN`)
- Cross-reference related decisions by date and title
- Keep decision numbering consistent within sessions

### General
- Dates in ISO format: YYYY-MM-DD
- File paths in backticks: `path/to/file`
- Decision titles should be searchable keywords
- Always include WHY, not just WHAT

## Anti-Patterns to Avoid

- Deleting or overwriting history
- Vague reasoning ("it seemed better")
- Missing alternatives ("we just decided X")
- Orphaned references (mentioning decisions without context)
- Inconsistent formatting between sessions

## Rules

- Never delete history
- Mark issues as `RESOLVED` when fixed (don't remove them)
- Include actual error messages when relevant
- Keep it concise but useful for future sessions
