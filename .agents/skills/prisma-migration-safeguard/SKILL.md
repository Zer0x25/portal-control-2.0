---
name: prisma-migration-safeguard
description: >-
  Step-by-step procedure and safety checks for database schema changes and Prisma migrations. Use this skill whenever modifying schema.prisma, generating or applying migrations, or writing transactional database logic with PgBouncer and DIRECT_URL.
---

# Prisma & Database Migration Safeguard Runbook

This skill outlines the mandatory architectural constraints, safe generation flow, and validation checklist for any database schema alterations or transactional operations in `portal-control`.

---

## Core Invariants & Architectural Rules

1. **PgBouncer & Transaction Mode (`POOL_MODE: transaction`)**:
   - Runtime traffic connects via PgBouncer on port `6432` (`DATABASE_URL`).
   - Server-level session state (`set_config`), advisory locks, and interactive transactions are lost across statement boundaries in transaction mode.
   - **Prisma CLI & DDL Migration**: Must connect directly to PostgreSQL on port `5432` (`DIRECT_URL`). This is enforced via `backend/prisma.config.ts`.
2. **Interactive Transactions in Code**:
   - Any transaction executing multiple interdependent queries or setting session config (`set_config`) **must** use `withDirectTransaction` from `backend/src/services/db.ts`.
3. **Prisma 7 Client Imports (ADR-0015)**:
   - Always import Prisma types and client from `backend/src/generated/prisma/client`.
   - Never import directly from `@prisma/client`.

---

## Fast-Track Precheck (One Command)

Verify configuration integrity and schema syntax before starting:

```bash
node .agents/skills/prisma-migration-safeguard/scripts/precheck.cjs
```

Helper script: [precheck.cjs](./scripts/precheck.cjs)

---

## Step-by-Step Migration Workflow

### Step 1: Modify `backend/prisma/schema.prisma`

Apply model, field, or relationship alterations to the Prisma schema.

### Step 2: Generate Migration Draft with `--create-only`

Never apply a migration to the database without inspecting the raw SQL first:

```bash
cd backend
npx prisma migrate dev --create-only --name <descriptive_slug>
```

_Artifact created_: `backend/prisma/migrations/<timestamp>_<descriptive_slug>/migration.sql`.

### Step 3: Audit Generated SQL (Locking & Safety Checklist)

Open and inspect `migration.sql` against these safety criteria:

- **Exclusive Locks**: Does `ALTER TABLE` introduce long table locks? (Avoid heavy locks on high-throughput tables like `time_records` or `shift_reports`).
- **Non-null Columns without Default**: Adding a `NOT NULL` column without a `DEFAULT` to an existing table fails on existing rows.
- **Index Creation**: For large tables, evaluate if `CREATE INDEX CONCURRENTLY` is required in an un-transactioned script.
- **Destructive DDL (`DROP COLUMN`, `DROP TABLE`)**: Follow the expand-and-contract pattern. Never drop a column that active application code still queries.
- **Schemas & Triggers**: Ensure `portal_runtime` schema, audit triggers, and existing constraints are preserved.

### Step 4: Apply Migration in Local / Development DB

Once the SQL is verified:

```bash
cd backend
npx prisma migrate dev
```

### Step 5: Regenerate Prisma Client

Regenerate the type-safe client under `backend/src/generated/prisma/client`:

```bash
cd backend
npm run db:generate
```

### Step 6: Verify Codebase & Regression Tests

Run the TypeScript check and integration suite to guarantee no type breaks or broken invariants:

```bash
cd backend
npm run check
npm run test:api:integration
```

---

## Concurrency & Anti-N+1 Guidelines

When writing application code interacting with the new schema:

- **Locking Sensitive Entities**: MFA attempts, PIN verification, session allocations, or password resets must use `FOR UPDATE` inside `withDirectTransaction`.
- **Prevent N+1 Queries (Bolt Journal)**: Never perform iterative queries (`findUnique`, `findFirst`) inside loops. Batch-fetch using `findMany({ where: { id: { in: [...] } } })`.
- **Parameterized SQL (Sentinel Journal)**: Never use string interpolation with `$executeRawUnsafe`. Use parameterized `$executeRaw`.
