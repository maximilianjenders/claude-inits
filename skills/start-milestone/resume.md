# Start Milestone — Resume & Crash Recovery

Loaded by `/start-milestone` only when there is prior state to recover (see SKILL.md "Resume Check").

### State Sources

1. **GitHub labels** - Issue status (in-progress, ready-for-review, code-complete, blocked-failed)
2. **Git log** - Which issues have commits (`git -C <worktree-path> log --oneline --grep="Refs #N"`)
3. **Issue state** - Open vs closed

### On Startup: State Assessment

**Step 1: Fetch all issue data**

```
mcp__workflow__gh_milestone_issues(milestone=5, state="all")
```

**Step 2: Check commits for each issue**

```bash
# For each issue number, check if commit exists
git -C <worktree-path> log --oneline --grep="Refs #N" --grep="#N" | head -1
```

Note: With batch commits, one commit may reference multiple issues (e.g., `Refs #70, #71, #72`). The grep still works — it finds the commit containing each issue number.

**Step 3: Categorize each issue**

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

### Recovery Actions by State

**`ready-for-review` issues:**
- Already implemented, tests passed, self-reviewed
- Dispatch review agent to review all pending changes
- After review passes, orchestrator commits and closes

**`in-progress` issues:**
- Check for partial work: `git -C <worktree-path> status`, `git -C <worktree-path> diff`, commits
- Dispatch recovery agent with context (see `recovery-prompt.md`)
- Agent continues work → marks ready-for-review
- Then proceeds to review → commit flow

**`blocked-failed` with `--retry-failed`:**
- Reset label to none
- Queue for fresh implementation attempt
