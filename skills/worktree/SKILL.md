---
name: worktree
description: Create or manage git worktrees for parallel work
user_invocable: true
argument-hint: "<action> [branch]"
---

# Worktree

Manage git worktrees for working on multiple branches simultaneously.

## Usage

```
/worktree list                              # List existing worktrees
/worktree create feature/phase5-variety     # Create worktree for branch
/worktree remove phase5-variety             # Remove worktree
/worktree cd phase5-variety                 # Show path to worktree
```

## When to Use Worktrees

- **Parallel work:** Working on a feature while also doing tooling/infra work
- **Quick fixes:** Hotfix on master while feature work is in progress
- **Code review:** Checking out PR branch without losing current work

## Conventions

| Convention | Value |
|------------|-------|
| Location | `.worktrees/` in project root |
| Naming | Branch name without `feature/` prefix |
| Gitignore | `.worktrees/` should be in `.gitignore` |

**Examples:**
| Branch | Worktree Directory |
|--------|-------------------|
| `feature/phase5-variety-tracking` | `.worktrees/phase5-variety-tracking/` |
| `feature/infra-cicd` | `.worktrees/infra-cicd/` |

## Actions

### list

```bash
git worktree list
```

### create

```bash
BRANCH=$1
WORKTREE_NAME=${BRANCH#feature/}  # Remove feature/ prefix

# Create worktree
git worktree add .worktrees/$WORKTREE_NAME $BRANCH

# Setup (detect project type and install deps)
cd .worktrees/$WORKTREE_NAME

# Python (Poetry)
if [ -f backend/pyproject.toml ]; then
  poetry -C backend install
fi
if [ -f pyproject.toml ]; then
  poetry install  # or: uv sync
fi

# Node
if [ -f frontend/package.json ]; then
  npm --prefix frontend install
fi
if [ -f package.json ]; then
  npm install
fi

echo "Worktree created at .worktrees/$WORKTREE_NAME"
echo "To work there: cd .worktrees/$WORKTREE_NAME"
```

### remove

```bash
WORKTREE_NAME=$1
git worktree remove .worktrees/$WORKTREE_NAME
```

### cd

```bash
WORKTREE_NAME=$1
echo ".worktrees/$WORKTREE_NAME"
# Note: Can't actually cd in a skill, just report the path
```

## Running Commands in Worktrees

When in main worktree, run commands in a different worktree:

```bash
# Tests
poetry -C .worktrees/phase5-variety-tracking/backend run pytest
npm --prefix .worktrees/phase5-variety-tracking/frontend test

# Or cd first
cd .worktrees/phase5-variety-tracking && poetry -C backend run pytest
```

## Cleanup

After merging a feature branch, clean up the worktree:

```bash
git worktree remove .worktrees/$WORKTREE_NAME
git branch -d feature/$WORKTREE_NAME  # Delete local branch
```
