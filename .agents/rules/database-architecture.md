---
trigger: model_decision
description: Database architecture rules, PgBouncer transaction mode, withDirectTransaction, PostgreSQL session variables, locking, and N+1 query prevention.
---

# Database & Architecture Constraints

## 1. PgBouncer & Transactions
- **Transaction Mode**: PgBouncer runs with `POOL_MODE: transaction`. Server-level session state is not preserved across transactions.
- **Direct Transactions (`DIRECT_URL`)**: Any interactive transaction or operation setting PostgreSQL session variables (`set_config`) **must** use `withDirectTransaction` from `backend/src/services/db.ts` to ensure execution over the direct database connection.
- **Prisma 7 (ADR-0015)**: Import the client and types from `backend/src/generated/prisma/client`, never from `@prisma/client`. Connection pools live in `backend/src/services/db.ts` (`pg.Pool` + `PrismaPg` adapter). Any Prisma CLI command evaluates `backend/prisma.config.ts` and requires `DIRECT_URL` in the environment.

## 2. Concurrency & Locking
- Mutating sensitive entities (MFA budgets, PIN checks, session allocation, password resets) must serialize changes with `FOR UPDATE` inside `withDirectTransaction`.
- Failed authentication/MFA attempts must commit counter increments before throwing errors (return failure status prior to throwing 401).
- Claims and runtime jobs use persistent permissions and transactional locking (`portal_runtime` schema). Never expire locks or clean claims automatically after a reboot.

## 3. N+1 Query Prevention (Bolt Journal)
- Never execute iterative queries (`findUnique`, `findFirst`) inside loops over collections of records.
- Always batch-fetch dependencies using `findMany` with `{ in: [...] }` or use `schedulingService.getSchedulingContext(...)` prior to mapping.
- Execute concurrent asynchronous operations with `Promise.all()` over `Array.map()` when operations are independent.

## 4. SQL Injection & Sentinel Guardrails
- Never use `$executeRawUnsafe` with string interpolation or concatenation.
- Use parameterized `$executeRaw` with PostgreSQL's `set_config`: `SELECT set_config('audit.username', ${username}, true)`.
- Always validate 100% of batch items (never use partial slices like `records.slice(0, 10)` for security, locking, or date range checks).
