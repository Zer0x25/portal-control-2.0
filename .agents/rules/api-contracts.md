---
trigger: model_decision
description: Fastify HTTP routing invariants, route manifest, OpenAPI sync, validation preHandlers, and route guards.
---

# API Contract & Fastify Route Guards

## 1. Fastify Exclusivity
- Fastify is the only HTTP server runtime. Express is permanently retired; never import, maintain, or recreate Express runtimes, middleware, controllers, or parity tests.
- All HTTP route corrections, plugins, and handlers must be implemented natively in Fastify.
- Architecture guard tests (`tests/architecture-guard.test.ts`) prohibit any Express dependencies or legacy adapter imports.

## 2. Route Manifest & Validation Guards
- **Manifest Registration**: `buildFastifyApp` registers the full `routeManifest` via `onRoute`.
- **Validation Marker**: Every mutating HTTP route (`POST`, `PUT`, `PATCH`, `DELETE`) in the manifest must include a request validator preHandler detected by `isRequestValidator`.
- **Anti-Vacuity Assertions**: Runtime integration tests (`tests/fastify-integration/runtime.test.ts`) verify that the route manifest is non-empty and matches OpenAPI definitions.

## 3. OpenAPI Contract Sync
- OpenAPI route paths must match the mount prefix exactly (e.g. singularized `/api/email`, `/api/export`, `/api/configs`).
- Keep OpenAPI and SDK synchronized: run `npm run check:sdk` inside `backend/` to regenerate `docs/swagger.json` and `frontend/src/types/api-schema.ts`. Fails in CI if uncommitted drift exists.
- OpenAPI operations are generated from `src/platform/openapi/operations.ts`.

## 4. Special Route Exceptions
- `/api/health` bypasses maintenance mode and the global rate limiter. Native HTTP tests must preserve these exceptions.
- Administrative routes (`/api/admin`, `/api/maintenance`) enforce strict role guards (Administrator only) and specific body limits.
