---
name: sdd-cycle
description: >-
  Step-by-step workflow for Spec-Driven Development (SDD) and Architecture Decision Records (ADR). Use this skill whenever planning, scaffolding, implementing, or documenting new functional features, major architectural refactors, or permanent technical decisions.
---

# Spec-Driven Development (SDD) & ADR Lifecycle Runbook

This skill outlines the mandatory execution sequence for building features, substantial refactors, and architectural evolutions in `portal-control` under Constitution Principle V (_"Spec antes que PR"_).

---

## Core Invariants

1. **No Code without Spec**: Every functional capability (`feat:`) or major architectural refactoring (`refactor:`) must have a corresponding specification in `specs/NNNN-slug/`.
2. **Tripartite Spec Structure**: Every spec requires `spec.md` (acceptance criteria), `plan.md` (technical roadmap), and `tasks.md` (atomic actionable checklist).
3. **Acceptance Criteria Verification**: Each acceptance criterion (`AC`) in `spec.md` must be testable and mapped to one or more tasks in `tasks.md`.
4. **Architecture Decision Records (ADR)**: Permanent decisions, protocols, invariants, or tool cutovers must be recorded in `docs/adr/00XX-slug.md` and registered in `docs/adr/README.md`.

---

## Step-by-Step SDD Lifecycle

### Step 1: Scaffold Spec Directory (and Optional ADR)

Run the scaffolding utility from the workspace root:

```bash
# Para una funcionalidad sin cambios de arquitectura permanente
npm run spec:new <slug-descriptivo>

# Para cambios que además introducen o cambian un invariante arquitectónico permanente
npm run spec:new <slug-descriptivo> -- --adr
```

This automatically:

- Resolves the next numerical identifier in `specs/` (e.g. `specs/026-<slug>/`).
- Copies and parametrizes `spec.md`, `plan.md`, and `tasks.md`.
- (If `--adr` is set) Resolves the next ADR number, creates `docs/adr/00XX-<slug>.md`, and updates the index in `docs/adr/README.md`.

---

### Step 2: Fill out `spec.md` (Requirements & Acceptance Criteria)

Edit `specs/NNNN-slug/spec.md`:

- **Problema**: Describe what hurts or what is needed with concrete evidence (logs, code lines, issues).
- **Alcance**: State explicitly what is inside scope and what is outside scope.
- **Criterios de aceptación**: Formulate verifiable criteria with checkboxes:
  ```markdown
  ## Criterios de aceptación

  - [ ] AC1: Given ... When ... Then ...
  - [ ] AC2: ...
  ```

---

### Step 3: Formulate Technical Plan (`plan.md`)

Edit `specs/NNNN-slug/plan.md`:

- **Estrategia**: Technical breakdown in sequential phases.
- **Archivos a tocar**: Table listing targets and modifications.
- **Contratos afectados**: Detail API mounts, schemas, routes, or SDK regenerations.
- **Riesgos y rollback**: Failure modes and how to cleanly revert.

---

### Step 4: Define Atomic Task Checklist (`tasks.md`)

Edit `specs/NNNN-slug/tasks.md`:

- Every task must cite its target acceptance criteria:
  ```markdown
  - [ ] T1: Implement unit tests and schema (AC1)
  - [ ] T2: Build service and handler (AC1, AC2)
  - [ ] T3: Execute `npm run validate:ci` in backend and frontend
  - [ ] T4: Update docs / promote ADR if permanent
  ```

---

### Step 5: Test-Driven Implementation (TDD)

1. Write failing tests first (unit or integration) asserting the acceptance criteria.
2. Implement backend/frontend logic until tests pass.
3. Update task checkboxes in `tasks.md` (`- [x] T1: ...`).
4. Keep contracts synced if HTTP routes changed (`npm run api:sync`).

---

### Step 6: Promote or Update ADR (if permanent)

If the spec introduced or altered a structural decision (e.g. Fastify plugins, auth mechanisms, DB pooling, ratchet policies):

1. Complete `docs/adr/00XX-slug.md` (Context, Decision, Alternatives, Consequences).
2. Ensure it is indexed in `docs/adr/README.md`.
3. Verify links with `npm run docs:check`.

---

### Step 7: Preflight Validation & Commit

Run the preflight suite before pushing:

```bash
npm run spec:check    # Verifies all specs have valid format & checkboxes
npm run docs:check    # Verifies markdown links & ADR index
npm run preflight     # Full suite: secrets, specs, docs, lint budget, typecheck
```

Commit following Conventional Commits (`feat(modulo): ...`, `refactor(modulo): ...`).
