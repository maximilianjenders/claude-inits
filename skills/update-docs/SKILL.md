---
name: update-docs
description: Update project documentation based on current conversation
user_invocable: true
---

# Update Docs

Update CLAUDE.md (AI-facing) and README.md (human-facing) after significant work.

## When to Use

Call `/update-docs` after completing features that change:
- Project structure (new directories, renamed paths)
- Commands or scripts
- Conventions or rules
- User-facing functionality

## Target Files

| File | Audience | Content |
|------|----------|---------|
| CLAUDE.md | AI agents | Directory structure, commands, conventions, rules |
| README.md | Humans | Features, usage, architecture overview |

## Execution Flow

### 1. Gather Context

Run these commands to understand what changed:

```bash
# Changed files summary
git diff master...HEAD --stat 2>/dev/null || git diff HEAD~10 --stat

# Detailed changes (excluding generated files)
git diff master...HEAD -- ':!*.lock' ':!node_modules' ':!dist' ':!build' 2>/dev/null | head -500
```

Also analyze the current conversation for:
- Architectural decisions made
- New features implemented
- Conventions established

### 2. Classify Changes

Determine what needs updating:

| Change Type | Update Target |
|-------------|---------------|
| New directories/file patterns | CLAUDE.md -> Directory Structure |
| New commands/scripts | CLAUDE.md -> Development Commands |
| New conventions/rules | CLAUDE.md -> Project-Specific Rules |
| New user-facing features | README.md |
| Architecture changes | Both files |

### 3. Read Current Docs

```bash
# Check if files exist
[ -f CLAUDE.md ] && echo "CLAUDE.md exists" || echo "No CLAUDE.md"
[ -f README.md ] && echo "README.md exists" || echo "No README.md"
```

Read both files to understand their current structure.

### 4. Make Targeted Edits

- Edit only the relevant sections
- Preserve existing formatting and structure
- Add new content in the appropriate location
- Don't rewrite entire files

### 5. Stage and Summarize

```bash
# Stage only if changed
git add CLAUDE.md README.md 2>/dev/null
git status --short
```

Report what was updated and why.

## Guardrails

**No changes detected:** Report "No documentation updates needed" - don't make unnecessary edits.

**Missing files:** Warn and skip if CLAUDE.md or README.md doesn't exist.

**Large diffs:** For diffs over 500 lines, focus on `--stat` summary + conversation context.

**What NOT to update:**
- Normal feature work (button added, bug fixed)
- Self-explanatory code changes
- Information already in code comments

## Checklist

**Follow this checklist. Skip gracefully if no updates needed.**

### Pre-work Verification
- [ ] Check if CLAUDE.md exists
- [ ] Check if README.md exists
- [ ] If neither exists: warn and exit (don't create from scratch)

### Gather Context
- [ ] Run `git diff master...HEAD --stat` to see changed files
- [ ] Review conversation for architectural decisions, new features, conventions

### Classify Changes
- [ ] New directories/file patterns → CLAUDE.md
- [ ] New commands/scripts → CLAUDE.md
- [ ] New conventions/rules → CLAUDE.md
- [ ] New user-facing features → README.md
- [ ] Architecture changes → Both files

### Make Updates
- [ ] Read current docs to understand structure
- [ ] Edit only relevant sections (don't rewrite entire files)
- [ ] Preserve existing formatting

### Completion
- [ ] If changes made: stage files (`git add`)
- [ ] If no changes needed: report "No documentation updates needed"
- [ ] Summarize what was updated and why
