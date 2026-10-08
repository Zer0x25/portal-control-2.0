---
trigger: model_decision
description: TypeScript strictness standards, removing 'any', handling errors with caughtError, time policy in Chile, and zero-warning lint budget.
---

# Type Safety & Lint Standards

## 1. Zero-Warning Ratchet (`lint-budget.json`)
- ESLint warnings are strictly ratcheted. The budget is pinned at **0 warnings / 0 errors** in both `backend` and `frontend`.
- Any new warning fails CI (`npm run lint:budget`).
- After intentionally removing warnings or refactoring, update the budget with `npm run lint:budget:update` and commit the updated `lint-budget.json`.

## 2. Eliminating `any` and Strict Typing Patterns
- **Prisma Extended Client**: Do not import `PrismaClient` from `@prisma/client`. The client in `backend/src/services/db.ts` is extended (`$extends`). Use:
  ```typescript
  import type { default as extendedPrisma } from "./db";
  type DbClient = typeof extendedPrisma | Prisma.TransactionClient;
  ```
  Prefer type-only imports to prevent circular dependencies.
- **Error Handling**: Never use `catch (error: any)`. Use `toCaughtError(value: unknown)` from `src/utils/caughtError.ts`. Keep `throw error` re-throws pointing at the original caught object so stack traces and instances survive.
- **Prisma Filters**: Use `Prisma.<Model>WhereInput` instead of loose objects.
- **Request Principal**: Never cast `(req as any).user`. Use native Fastify request typing or import `AuthUser` from `backend/src/modules/auth/index.ts`.
- **JSON Fields**: Use `Prisma.InputJsonValue` for writes and `Prisma.JsonValue` for reads.
- **Query Parameters**: Use `queryString()` from `backend/src/utils/stringUtils.ts` rather than `as string` casts on `req.query`.
- **Date Handling & Chile Timezone**: Avoid `new Date(x + "T00:00:00Z")` due to off-by-one bugs in `America/Santiago`. Use `parseBusinessDateCL` or `differenceInCalendarDaysCL` from `src/utils/timePolicy.ts`.

## 3. Logging & Console Output
- Never leave `console.log` statements in production services or client code.
- Use structured loggers: `backend/src/utils/logger.ts` (JSON to stdout) and `frontend/src/utils/logger.ts`.
- `no-console` only permits `warn` / `error`.

## 4. Test Files Exemption
- Test files (`src/**/*.test.*`, `src/**/*.spec.*`, `src/tests/**`) intentionally have `@typescript-eslint/no-explicit-any` disabled for mock doubles. Do not extend this exemption to production `src/` code.
