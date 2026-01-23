---
description: Update project documentation and commit - ensures context is preserved for future sessions
allowed-tools: Read, Edit, Write, Glob, Bash(git diff:*), Bash(git status:*), Bash(git add:*), Bash(git commit:*)
---

# Update Project Documentation

Session-end ritual to ensure all context is preserved in the right places and committed to git.

## Step 1: Gather Context

1. Run `git status` to see what files changed this session
2. Run `git diff --cached` and `git diff` to see changes
3. Read current state of documentation files:
   - `STATUS.md` - current project state
   - `DECISIONS.md` - architectural decisions
   - `GOTCHAS.md` - troubleshooting knowledge

## Step 2: Analyze the Session

Review the conversation and extract:

### New Decisions
- Were any architectural choices made?
- What was the reasoning (WHY)?
- What alternatives were considered?

### Solved Issues
- Were any bugs or problems solved?
- Is the fix reusable (would help future sessions)?
- What was the root cause and solution?

### Progress Made
- What was accomplished?
- What's the new current state?
- What should happen next?

### Open Questions
- Were any questions resolved? (Move from STATUS.md to DECISIONS.md)
- Are there new unresolved questions?

## Step 3: Update Documentation

### STATUS.md (Update every session)

Refresh with current state:

```markdown
# Project Status

## Current State
[One paragraph: What exists, what works, current branch/PR situation]

## Active TODOs
- [ ] Immediate next task
- [ ] Second priority
- [ ] Third priority

## Open Questions
- **[Topic]**: [Question that needs deciding]

## Recent Context
[2-3 bullets: What happened recently, any gotchas to be aware of]
```

Rules:
- Maximum ~50 lines - trim if growing beyond this
- Delete completed TODOs (git history has them)
- Move resolved questions to DECISIONS.md
- Replace old "Recent Context" with new

### DECISIONS.md (Update when decisions were made)

Append new decisions:

```markdown
---

## D[N]: [Short Title]
**Date:** YYYY-MM-DD
**Status:** Active

**Context:** [What prompted this decision]

**Decision:** [What was decided]

**Rationale:** [Why this choice]

**Alternatives Considered:**
- [Option] - rejected because [reason]

**See also:** [Link to plan if relevant]
```

Rules:
- Append-only - never delete
- Mark superseded decisions with status
- Number sequentially (check last number first)
- Link to relevant plans in docs/plans/

### GOTCHAS.md (Update when issues were solved with reusable fixes)

Add new gotchas:

```markdown
---

### [Searchable Title]
[Brief description of the problem]

**Fix:** [Copy-pasteable solution]

```code
# Example if helpful
```
```

Rules:
- Only add if the fix is reusable
- Group under: Codebase, Environment, or Debugging
- Make titles searchable (specific keywords)
- Include copy-pasteable solutions

### README.md (Rarely - only if architecture changed)

Only update if:
- Tech stack changed
- Architecture diagram needs updating
- New setup steps required

## Step 4: Validate Before Commit

Check that:
- [ ] STATUS.md reflects current state and has clear next steps
- [ ] Any new decisions are in DECISIONS.md with rationale
- [ ] Any solved issues with reusable fixes are in GOTCHAS.md
- [ ] No stale information left behind
- [ ] No orphaned open questions

## Step 5: Commit

Stage and commit documentation:

```bash
git add STATUS.md DECISIONS.md GOTCHAS.md README.md
git commit -m "(docs): Update project documentation

- [Summary of what changed]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

If other files were changed this session and not yet committed, include them with an appropriate commit message.

## Anti-Patterns to Avoid

- Verbose session play-by-play (noise)
- "What worked" sections (noise)
- Keeping completed TODOs around
- Duplicating information across files
- Forgetting to commit
