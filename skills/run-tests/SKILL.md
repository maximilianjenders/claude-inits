---
name: run-tests
description: Run available test suites with auto-detection
user_invocable: true
argument-hint: "[type]"
---

# Run Tests

Auto-detect and run available test suites for the current project.

## Usage

```
/run-tests           # Run all detected test types
/run-tests backend   # Run only backend tests
/run-tests frontend  # Run only frontend tests
/run-tests e2e       # Run only E2E tests
```

## Detection Rules

Check for these markers to determine what tests are available:

### Backend Tests
**Marker:** `pyproject.toml` with pytest, or `tests/` directory with `test_*.py` files

**Commands by package manager:**
- Poetry: `poetry run pytest` or `poetry -C backend run pytest` (if backend/ subdir)
- uv: `uv run pytest`
- pip: `pytest`

### Frontend Tests
**Marker:** `vitest.config.ts`, `jest.config.js`, or `package.json` with test script

**Commands:**
- With frontend/ subdir: `npm --prefix frontend test`
- Root level: `npm test`

### E2E Tests
**Marker:** `playwright.config.ts` or `e2e/` directory with test files

**Location convention:**
- `frontend/e2e/` (preferred for projects with frontend/ subdir)
- `e2e/` (for single-package projects)

**Commands:**
- With frontend/ subdir: `npm --prefix frontend run test:e2e`
- Root level: `npm run test:e2e`

## Execution

1. **Detect project structure:**
   ```bash
   # Check for markers
   ls pyproject.toml package.json 2>/dev/null
   ls backend/pyproject.toml frontend/package.json 2>/dev/null
   ls playwright.config.ts frontend/e2e/playwright.config.ts e2e/ 2>/dev/null
   ```

2. **Run detected tests:**
   - Run each detected test type
   - Report results for each
   - Note any skipped types with reason

3. **Report format:**
   ```
   Backend:  ✓ 142 tests passed
   Frontend: ✓ 43 tests passed
   E2E:      ⊘ Not configured (no playwright.config.ts found)
   ```

## Worktree Support

When running in a worktree (detected by `.git` being a file not a directory):
- Adjust paths relative to worktree root
- Example: `poetry -C .worktrees/phase5/backend run pytest`
