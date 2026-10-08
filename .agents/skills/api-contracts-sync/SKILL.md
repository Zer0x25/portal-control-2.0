---
name: api-contracts-sync
description: >-
  Step-by-step procedure to synchronize Fastify OpenAPI routes, Swagger spec, and the frontend TypeScript SDK. Use this skill whenever adding, updating, or removing HTTP endpoints, Fastify request/response schemas, or OpenAPI operations.
---

# API Contracts & Frontend SDK Synchronization Runbook

This skill outlines the strict, sequential workflow required to keep Fastify route schemas, `backend/docs/swagger.json`, and `frontend/src/types/api-schema.ts` perfectly synchronized, preventing drift failures in CI (`verify-sdk-sync`).

## Pre-requisites & Rules Compliance

Before regenerating the contract:

1. **Validation Marker**: Every mutating route (`POST`, `PUT`, `PATCH`, `DELETE`) must register a request validator preHandler detected by `isRequestValidator`.
2. **Mount Prefix**: Route paths in OpenAPI must match the mount prefix exactly (e.g., `/api/email`, `/api/export`, `/api/configs`).
3. **OpenAPI Operations**: Update or register operations in `backend/src/platform/openapi/operations.ts` if adding or modifying route contracts.

---

## Fast-Track Execution (One Command)

To run the entire synchronization and hash guard sequence automatically:

```bash
node .agents/skills/api-contracts-sync/scripts/sync.cjs
```

Helper script: [sync.cjs](./scripts/sync.cjs)

---

## Detailed Execution Workflow (Step-by-Step)

### Step 1: Generate Swagger Spec (Backend)

Regenerate the OpenAPI 3.0 specification from the Fastify schema definitions:

```bash
cd backend
npm run docs:generate
```

_Artifact updated_: `backend/docs/swagger.json`.

---

### Step 2: Regenerate Frontend SDK (Frontend)

Generate TypeScript types from the updated Swagger specification:

```bash
cd frontend
npm run sdk:generate
```

_Artifact updated_: `frontend/src/types/api-schema.ts`.

---

### Step 3: Verify SDK Synchronization Hash Guard

Run the hash guard script to verify zero drift between the specifications:

```bash
cd backend
npm run check:sdk
```

_Verification_: This script snapshots and regenerates both specs; it will exit with code 0 only if both files match cleanly without uncommitted drift.

---

### Step 4: Validate TypeScript Type Checks

Ensure that no backend or frontend code broke due to contract changes:

1. **Frontend type check**:
   ```bash
   cd frontend
   npm run check
   ```
2. **Backend type check**:
   ```bash
   cd backend
   npm run check
   ```

---

### Step 5: Fastify Integration & Schema Smoke Test

Run Fastify schema and runtime verification tests:

```bash
cd backend
npm run test:schemas-refactor
npm run test:api:integration
```

---

## Troubleshooting Common Failures

| Failure / Error                               | Cause                                                                                | Remediation                                                                         |
| :-------------------------------------------- | :----------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| `❌ Swagger Spec was out of sync!`            | `backend/docs/swagger.json` had uncommitted differences before running verification. | Run `npm run docs:generate` inside `backend/` and stage `swagger.json`.             |
| `❌ Frontend SDK was out of sync!`            | `frontend/src/types/api-schema.ts` was not regenerated after OpenAPI changed.        | Run `npm run sdk:generate` inside `frontend/` and stage `api-schema.ts`.            |
| `routeManifest` mismatch in `runtime.test.ts` | Route was registered without schema or missing from Fastify app registry.            | Ensure route plugin is attached in `buildFastifyApp` with proper schema validation. |
