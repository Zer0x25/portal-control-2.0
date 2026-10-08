---
trigger: model_decision
description: Dependency upgrade cadence, routine sweep protocols, package isolation, and standing holds for pinned dependencies.
---

# Dependency Maintenance Cadence

Dependabot is disabled in this repository. Upgrades follow a scheduled monthly sweep with validated commits per package.

## 1. Inspection & Minor/Patch Updates
1. From repo root, inspect drift:
   ```bash
   (cd backend && npm outdated)
   (cd frontend && npm outdated)
   ```
2. Apply minor and patch updates explicitly: `npm update <pkg>` (never bare `npm update`).
3. Major version upgrades must be handled individually: validate, commit, push, and verify green CI (`gh run list --limit 3`) before proceeding.

## 2. Validation Discipline
- **Never validate both packages in parallel**: Backend's `npm run check:sdk` rewrites `frontend/src/types/api-schema.ts` mid-run, triggering false Prettier failures in frontend jobs.
- Run validations sequentially inside package directories:
  - Backend: `npm run validate:ci`
  - Frontend: `npm run validate:ci`

## 3. Standing Holds (Do Not Upgrade Until Blocker Lifts)
- **`typescript@7`**: `typescript-eslint` does not yet support TS 7.0 (requires TS >= 7.1 and removal of `moduleResolution: node10`).
- **`prisma@8`**: In release candidate (RC) only; wait for stable release.
- **`@babel/plugin-transform-runtime@8`**: Conflicts with `workbox-build`'s Babel 7 dependency tree (pinned to v7).
- **`@types/exceljs`**: Upstream npm `latest` (0.5.3) is lower than installed (1.3.2).
