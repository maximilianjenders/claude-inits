---
name: update-docs
description: Update project documentation based on current conversation
user_invocable: true
---

# Update Docs

Update CLAUDE.md (AI-facing) and README.md (human-facing) after significant work.

## When to Use

Call `/update-docs` after completing features that change:
- Conventions or rules that would surprise an agent reading only the code
- Non-obvious hazards, gotchas, or constraints
- User-facing functionality

## Target Files

| File | Audience | Content |
|------|----------|---------|
| CLAUDE.md | AI agents | Non-obvious conventions, rules, hazards — things an agent would get wrong from code alone |
| GOTCHAS.md | AI agents | Reusable fixes for non-obvious pitfalls (copy-pasteable, grouped by category) |
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

### 2. Read ALL Target Docs

**MANDATORY: Read every doc file BEFORE deciding what needs updating.** Do not reason about whether updates are needed until you've read the current content. You cannot judge staleness or completeness without seeing the file.

Read each file individually:
- [ ] Read `CLAUDE.md` (root and any sub-project CLAUDE.md files)
- [ ] Read `README.md`
- [ ] Read `GOTCHAS.md` (if exists)

### 3. Classify Changes

After reading all docs, determine what needs updating. Apply different tests per file:

**CLAUDE.md — Landmine test:** "Would an agent get this wrong if it just read the code?" If no, don't add it. Directory structures, commands, and file patterns are discoverable from code — only document them if there's a non-obvious gotcha.

**README.md — Staleness test:** "Does the README have sections (feature lists, test lists, architecture diagrams, tables) with entries that are now stale or incomplete given these changes?" The README is a living document for humans — any enumerated list that's missing new items is stale.

| Change Type | Update Target |
|-------------|---------------|
| Non-obvious conventions/rules | CLAUDE.md |
| Reusable gotchas/pitfalls | GOTCHAS.md |
| New user-facing features | README.md |
| Stale/incomplete enumerated lists | README.md |
| Architecture changes that create hazards | CLAUDE.md + README.md |

### 4. Suggest Pruning

Review CLAUDE.md for content that has become redundant or stale:
- **Discoverable info:** Directory structures, command lists, file patterns that an agent can find by reading the code
- **Stale entries:** Rules or conventions that no longer match the codebase
- **Duplicated info:** Content already expressed in code comments or config files

If you find candidates, present them to the user as a numbered list and ask for approval before removing. Example:

> **Prune suggestions for CLAUDE.md:**
> 1. "Directory Structure" section — discoverable from file tree
> 2. "Build command: `npm run build`" — discoverable from package.json
> 3. "Use camelCase for variables" — matches language defaults, not a landmine
>
> Which should I remove? (all / numbers / none)

Do not remove anything without explicit approval. If nothing to prune, skip this step silently.

### 5. Make Targeted Edits

- Edit only the relevant sections
- Preserve existing formatting and structure
- Add new content in the appropriate location
- Don't rewrite entire files

### 6. Stage and Summarize

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

**What NOT to add to CLAUDE.md:**
- Discoverable information (directory structure, commands, file patterns)
- Normal feature work (button added, bug fixed)
- Self-explanatory code changes
- Information already in code comments or config files
- Conventions that match language/framework defaults

## Checklist

**Follow this checklist. Skip gracefully if no updates needed.**

### Pre-work Verification
- [ ] Check if CLAUDE.md exists
- [ ] Check if README.md exists
- [ ] If neither exists: warn and exit (don't create from scratch)

### Gather Context
- [ ] Run `git diff master...HEAD --stat` to see changed files
- [ ] Review conversation for architectural decisions, new features, conventions

### Read ALL Docs (mandatory before any decisions)
- [ ] Read `CLAUDE.md` (root + sub-project files)
- [ ] Read `README.md`
- [ ] Read `GOTCHAS.md` (if exists)

### Classify Changes
- [ ] CLAUDE.md: Apply landmine test — non-obvious conventions/rules only
- [ ] README.md: Apply staleness test — check all enumerated lists for missing/outdated entries
- [ ] GOTCHAS.md: Reusable gotchas/pitfalls
- [ ] Architecture changes that create hazards → CLAUDE.md + README.md

### Prune
- [ ] Review CLAUDE.md for discoverable, stale, or duplicated content
- [ ] If candidates found: present numbered list and ask user for approval
- [ ] Remove only approved items

### Make Updates
- [ ] Edit only relevant sections (don't rewrite entire files)
- [ ] Preserve existing formatting

### Completion
- [ ] If changes made: stage files (`git add`)
- [ ] If no changes needed: report "No documentation updates needed"
- [ ] Summarize what was updated and why
