---
name: ci-preflight
description: >-
  Step-by-step preflight checklist and validation runbook before committing or pushing changes. Use this skill to verify lint ratchet (0/0), governance gates (secrets, docs, specs), TypeScript type checks, and Conventional Commit message compliance.
---

# CI Preflight & Governance Quality Runbook

This skill provides the mandatory verification sequence before committing changes or opening a PR to ensure that GitHub Actions CI, `release-please`, and local pre-push hooks pass on the first attempt.

## Quality Invariants & Ratchets (Must Pass)

1. **ESLint Ratchet**: The warning count is pinned at `0/0` in `lint-budget.json`. Any new warning fails CI.
2. **Conventional Commits**: Commit messages must strictly follow `type(optional-scope): message`. No emojis in the subject line (they break `release-please`).
3. **Zero `any` & Strict Types**: No `any` types permitted in production TypeScript (`src/`).

---

## Fast-Track Execution (One Command)

To run all fast governance gates and lint budgets in one command:

```bash
node .agents/skills/ci-preflight/scripts/preflight.cjs
```

Helper script: [preflight.cjs](./scripts/preflight.cjs)

---

## Detailed Execution Checklist (Step-by-Step)

### Step 1: Governance & Security Gates (Root)

Run the lightweight repository integrity checks:

```bash
npm run secrets:scan   # Detects accidental secrets/tokens
npm run spec:check      # Validates BDD/TDD specification format
npm run docs:check      # Checks ADR links and markdown integrity
```

### Step 2: Lint Budget Ratchet Check

Verify that ESLint warnings do not exceed the ratchet:

```bash
npm run lint:budget
```

If errors or new warnings appear:

- Fix the warnings in the respective code files.
- Never increase the budget in `lint-budget.json` unless explicitly approved.

### Step 3: TypeScript Type Checking

Verify types across both workspaces:

```bash
# Backend
cd backend && npm run check

# Frontend
cd ../frontend && npm run check
```

### Step 4: Conventional Commit Verification

Before committing, verify that your commit message adheres to Conventional Commits:

- **Valid examples**:
  - `feat(api): add export telemetry endpoint`
  - `fix(auth): handle session expiration on direct transaction`
  - `refactor(scheduling): optimize batch shift calculation`
  - `chore(deps): update prisma client to 7.0`
- **Invalid examples (DO NOT USE)**:
  - `🔒 fix: mfa issue` _(Emojis in subject are forbidden)_
  - `Update backend code` _(Missing conventional commit type)_

---

## Package-Specific Deep Validation (Before Merging to Main)

If your changes affect backend or frontend core logic:

- **Backend CI Suite**:
  ```bash
  cd backend && npm run validate:ci
  ```
- **Frontend CI Suite**:
  ```bash
  cd frontend && npm run validate:ci
  ```
