# Developer & AI Agent Guidelines (AGENTS.md)

This document provides conventions, operational commands, and architectural constraints for AI agents (including Google Jules) and contributors working on `portal-control`.

---

## 1. Project Structure

- **`backend/`**: Node.js (v26), Express (principal), Fastify (candidato), TypeScript, Prisma ORM, PostgreSQL (via PgBouncer in transaction mode).
- **`frontend/`**: React 19, Vite, TypeScript, Zustand, TanStack Query, Tailwind CSS.
- **`compose.yaml`**: Production-style stack (PostgreSQL 18.4, PgBouncer, backend, frontend, Nginx/Caddy). `compose.db.dev.yaml` ejecuta solo PostgreSQL para desarrollo local con Vite/Express en el host. `compose.staging.yaml` es prod-like vía gateway :8080 (`pweb3_staging`, host port 5434); ver README §5.
- **PostgreSQL 18.4** en todos los compose. Dos detalles no negociables:
  - `PGDATA` es `/var/lib/postgresql/<major>/docker`; el entrypoint ABORTA si el volumen se monta en `/var/lib/postgresql/data` (ver docker-library/postgres#37). El volumen va en `/var/lib/postgresql`.
  - `md5` está deprecado (avisa al crear/alterar roles). Todos los compose usan `--auth-host=scram-sha-256 --auth-local=scram-sha-256`.
- **`.jules/`**: Institutional memory journals:
  - `bolt.md`: Performance guidelines (N+1 prevention, batch fetching).
  - `sentinel.md`: Security constraints (safe command execution, SQL parametrization, strict secrets).

---

## 2. Validation & Build Commands

Always run these commands inside the respective package directories to verify changes:

### Backend (`cd backend`)

```bash
# 1. Install dependencies
npm ci

# 2. Generate Prisma Client (Mandatory after modifying schema.prisma)
npx prisma generate

# 3. Type check
npm run check

# 4. Code style & Lint
npm run format:check
npm run lint

# 5. Verify docs/swagger.json and the frontend SDK are in sync
npm run check:sdk

# 6. Full CI validation suite (format check, lint, lint budget, tsc, SDK sync,
#    schema tests, and tsc build)
npm run validate:ci
```

### Frontend (`cd frontend`)

```bash
# 1. Install dependencies
npm ci

# 2. Type check
npm run check

# 3. Lint & format check
npm run lint
npm run format:check

# 4. Full CI validation suite
npm run validate:ci
```

---

## 2.1 Lint Warning Budget (Ratchet)

ESLint warnings do not fail the build, so they accumulate silently. The repo
enforces a **ratchet**: the allowed warning count lives in `lint-budget.json`
and CI fails if the real count is higher.

```bash
# From the repo root — run the ratchet (fails if over budget)
npm run lint:budget

# Show the current state with a per-rule breakdown
npm run lint:budget:rules

# After deliberately removing warnings, tighten the budget to the new count
npm run lint:budget:update
```

Key points:

- The budget is **committed** and currently pinned at **0 warnings / 0 errors**
  in both packages. Any new warning fails CI.
- Run `npm run lint:budget:update` **only after** actually removing warnings, and
  include the updated `lint-budget.json` in the same commit.
- `lint:fix` / `--fix-dry-run` fixes **0** of these warnings — they are all
  "remove dead code" or "retype" problems, not formatting. There is no autofix
  shortcut; budget the work per file.
- Test files (`src/**/*.test.*`, `src/**/*.spec.*`, `src/tests/**`) have
  `@typescript-eslint/no-explicit-any` turned **off** on purpose: mock doubles
  are not a production type-safety concern. Do not re-enable it or extend the
  exemption to production `src` code.

Status: the campaign is **complete — 389 → 0**.

| Rule                                 | Before | After |
| ------------------------------------ | ------ | ----- |
| `@typescript-eslint/no-explicit-any` | 298    | 0     |
| `@typescript-eslint/no-unused-vars`  | 78     | 0     |
| `no-restricted-syntax`               | 5      | 0     |
| `no-console`                         | 7      | 0     |
| `no-restricted-imports`              | 1      | 0     |

To raise the budget again (a deliberate decision, not an accident), edit
`lint-budget.json` by hand and say why in the commit message.

---

## 3. Database & Architecture Constraints

1. **PgBouncer & Transactions**:
   - PgBouncer runs with `POOL_MODE: transaction`.
   - Any interactive transaction or operation setting PostgreSQL session variables (`set_config`) **must** use `withDirectTransaction` from `backend/src/services/db.ts` to ensure execution over the direct database connection (`DIRECT_URL`).
   - Prisma 7 (ADR-0015): import the client/types from `backend/src/generated/prisma/client`, never from `@prisma/client`. Pools live in `db.ts` (`pg.Pool` + `PrismaPg` adapter). Any Prisma CLI command evaluates `backend/prisma.config.ts` and requires `DIRECT_URL` in the environment (codegen/build without DB use a documented dummy).
2. **N+1 Query Prevention (Bolt Journal)**:
   - Never execute iterative `findUnique` or `findFirst` in loops over collections of records.
   - Always batch-fetch dependencies using `findMany` with `{ in: [...] }` or use `schedulingService.getSchedulingContext(...)` prior to mapping.
3. **Security Standards (Sentinel Journal)**:
   - Never use `child_process.exec` with string interpolation. Always use `execFile` or `spawn` with argument arrays.
   - Never concatenate strings in `$executeRawUnsafe`. Use parameterized `$executeRaw` with PostgreSQL's `set_config`.
   - Never provide weak fallback defaults for sensitive cryptographic secrets (e.g. `JWT_SECRET`).
   - Validate batch operations over the entire collection (never use partial slices like `records.slice(0, 10)` for security/locking checks).
4. **Code Quality**:
   - Avoid explicit `any` bypasses. Use strict interfaces or generics `<T>`.
   - Do not leave debugging `console.log` statements in production services or Redux store slices.
   - For console output, use the structured loggers instead of raw `console`:
     `backend/src/utils/logger.ts` (JSON to stdout) and
     `frontend/src/utils/logger.ts`. `no-console` only permits `warn`/`error`,
     and `frontend/src/utils/logger.ts` is the one sanctioned place where
     `console` output is allowed.

El piloto `backend/src/modules/holidays/` tiene API pública en `index.ts`.
Consumidores externos no importan archivos privados. Su aplicación no importa
Express, Fastify, Prisma, DB, entorno, red o reloj global: inyecta dependencias.
`npm run check:holidays` aplica strict y forma parte de `npm run check`.
El candidato Fastify expone health, las cinco rutas de feriados y las seis rutas
de autenticación (login/logout/quiosco/MFA) y las cuatro de usuarios (CRUD Admin)
y las seis de empleados (incluido Excel), con casos de uso compartidos.
`check:modules` aplica strict a auth, users, employees, records, shifts, leaves,
corrections, shiftReports, kpis, emailReports, meters, notes, configs, feriados y plataforma HTTP.
Express sigue siendo el servidor principal mientras se migran los demás módulos.
`npm run test:fastify:integration` crea y elimina PostgreSQL 18.4 desechable;
no reutiliza URLs de BD del entorno. Corre también en verify-backend de CI.
Los consumidores de auth usan index.ts; aplicación solo admite puertos y errores
compartidos, sin dependencias de servidor, BD, entorno ni reloj global.
MFA usa presupuesto persistido por usuario (cinco fallos en cinco minutos,
bloqueo cinco minutos); MFA/PIN serializan sus cambios con FOR UPDATE en
withDirectTransaction. Los intentos fallidos devuelven resultado antes de lanzar
401 fuera de la transacción, para que el contador se confirme. No exponer las
columnas de presupuesto MFA en DTO de usuarios ni sockets.
La proyección pública de usuarios está en modules/users/index.ts. UserService
selecciona campos públicos de Prisma y los proyecta explícitamente: nunca exponer
passwordHash, mfaSecret ni contadores MFA en HTTP o user:updated. Mantener
mfaEnabled y mustChangePassword; no propagar isForcePasswordChange interno.
Usuarios extrae list/create/update/delete con repositorio, hash, id, auditoría y
eventos inyectados; UserService conserva la fachada y ensure transaccional.
Empleados usa index.ts y aplicación pura con puertos; composición en
services/employeeFlows.ts conserva withDirectTransaction y ensureEmployeeUser
sobre el mismo cliente. No exponer PIN en HTTP/employee:updated; quiosco conserva
seis campos. Validar el lote completo y conservar streaming Excel sin casts a
Express.Response. Los borradores siguientes están en specs/roadmap-fastify.md.
Records y shifts tienen API pública index.ts y aplicación pura con puertos.
Fastify añade nueve rutas records y dieciocho shifts con flujos compartidos Express.
Bulks conservan límite 10 MiB, resto 1 MiB. MonthlyShiftService conserva transacción
con withDirectTransaction. Matriz Usuario/quiosco sin vínculo devuelve 403.
Deudas 015: calendario mensual consulta UTC y muestra el día anterior en Chile,
con queries por día heredadas; no replicar. Assignments sin vínculo de Usuario y
quiosco mantienen scope legacy pendiente de decisión. Matriz sí usa batch context.
Leaves/corrections tienen API pública index.ts y aplicación pura con puertos.
Tres rutas leaves y cinco corrections comparten flujos Express/Fastify. POST leaves
conserva parse explícito del schema; corrections valida sin reemplazar body.
Reloj_Control gestiona leaves pero no resuelve corrections. Aprobación conserva
withDirectTransaction, claim pending e idempotencia concurrente. Errores compartidos
AppError/toCaughtError son helpers puros admitidos por el guard de estos módulos.
Deudas 016: al extender leave, jornadas archivadas no se reactivan; materialización
no atómica y solapamiento permitido. Correcciones no coteja employeeId/timeRecordId,
y conserva lectura sin vínculo Usuario y scope quiosco legacy. Resolver antes de cutover.
ShiftReports tiene API pública index.ts, aplicación pura y tres rutas nativas
list/save/export Excel. Conserva MAX numérico/retry de folios, conflicto 409 y
orquestación Express compartida. Exportador acepta Writable neutral; helper stream
sincroniza headers del response hasta primer byte para errores JSON y XLSX.
Deudas 017: id opcional en schema falla en servicio, abierto soft-deleted bloquea,
open no es exclusivo bajo concurrencia; audit previo a write no atómico y JSON
legacy corrupto rompe export aunque list lo normalice. Resolver antes de cutover.
KPI comparte cuatro flujos con puertos de fechas/motor, sin reloj global en aplicación.
Summary/detailed preservan rango exclusivo y límites 1/5 años. Proyección pública
retira PIN de overview y ausencias en ambos servidores. Caché cerrada conserva
materialización/reutilización; invalidación y contexto UTC/ayer siguen pendientes.
EmailReports comparte doce rutas de correo/reportes programados y puertos neutrales.
SMTP conserva cifrado y enmascarado; tests sustituyen proveedor sin entrega externa.
Deudas 019: schemas HTTP y servicios divergen en config/rules/reportes; validar sin
reemplazar body conserva extras y defaults no aplicados. Cron parcial/reloj local y
toggle read/update requieren contrato correctivo antes de cutover.
Meters/notes/configs tienen límites independientes, aplicación pura y catorce rutas
nativas. Configs conserva dos lecturas públicas PDF, multipart 15 MiB y descarga
con Range/ETag; plugins multipart/static no publican carpeta. Flujos comparten
parsing de colección completa, errores de cierre, puertos de reloj/archivos.
Deudas 020: rango medidores mezcla UTC/local; lotes no atómicos y autores cliente;
configs genérico/auditoría expone secretos a roles elevados, write/audit no atómicos,
PDF solo MIME y posible archivo huérfano al fallar upsert. Resolver antes de cutover.
Ver specs 006/007/008/009/010/011/012/013/014/015/016/017/018/019/020 y ADR-0017/0018/0019.

---

## 4. Removing Lint Warnings Efficiently

`no-explicit-any` is the dominant warning class. Do **not** rewrite all of them
in one pass: the blast radius is the whole codebase. Instead, work in this order.

### Order of attack

1. **`no-restricted-syntax` / `no-restricted-imports`** — these are architecture
   guardrails, not style. Fix them first because they are few and often mask
   real bugs. Watch out: the date anti-patterns (`new Date(x + "T00:00:00Z")`)
   are an **off-by-one bug** in `America/Santiago`. Midnight in Santiago is not
   midnight UTC, so `new Date("2026-01-01T00:00:00Z")` formats to
   `2025-12-31` in business time. Use `parseBusinessDateCL` (instant) or
   `differenceInCalendarDaysCL` (day delta) from `src/utils/timePolicy.ts`.
2. **`no-console`** — mechanical, low risk. Use the loggers.
3. **`no-unused-vars`** — mechanical, low risk, high count. Split by directory
   and batch several files per change. The config only allows unused _args_
   matching `/^_/`, so rename those; for destructured props, simply omit them
   from the destructuring pattern instead of touching the type or the caller.
4. **`no-explicit-any`** — the long tail. Attack by density, see below.

### Batching `no-explicit-any`

Ranked by occurrences, group by file and go highest-density first; low-density
files finish the job and are quick wins. Patterns that recur, with the fix that
worked here:

- **`prisma as any`** — do **not** use `PrismaClient` from `@prisma/client`; it
  does not compile, because the client in `src/services/db.ts` is `$extends`-wrapped
  and the extended type lacks `$on`. Use
  `import type { default as extendedPrisma } from "./db"` and
  `type DbClient = typeof extendedPrisma | Prisma.TransactionClient`.
  Prefer a TYPE-ONLY import so nothing is emitted and no cycle appears. Some
  helpers accept a narrower structural type (`TxLike`) that the extended client
  already satisfies — in that case just delete the cast.
- **`catch (error: any)`** — use `src/utils/caughtError.ts`:
  `toCaughtError(value: unknown)` returns `{ message, code?, message_display?,
details?, statusCode, isAppError }`. Keep `throw x` rethrows and raw logger
  arguments pointing at the ORIGINAL error, never the narrowed object, so
  stacks and `instanceof` survive.
- **`const where: any = {}`** as a Prisma filter — use `Prisma.XWhereInput`;
  build it per branch or use `Prisma.XWhereInput[]` with `AND`.
- **`(req as any).user`** — import `AuthRequest` from
  `src/middleware/authMiddleware.ts`. Note some controllers pass a narrowed
  literal, so `NonNullable<AuthRequest["user"]>` may be too strict; declare the
  precise fields actually read instead of falling back to `any`.
- **JSON Prisma columns** — `Prisma.InputJsonValue` for writes, `Prisma.JsonValue`
  for reads. Prisma serializes, so no `JSON.stringify` is needed.
- **Generic components** — a component that maps over caller-supplied rows is
  usually better as `Component<T extends Row>` than as a prop typed `any`.
- **Unconstrained JSON** — use a recursive `JsonValue` type instead of `any`.

Two useful distinctions:

- **Production code vs tests.** ~70 `any` lived in test files, mostly mock casts.
  The rule is now off for test globs; keep it on for production `src`.
- **Do not "fix" behavior silently.** If an unused variable or loose `any` looks
  like a real bug, keep the current runtime behavior and surface the finding.

Always re-run `npx tsc --noEmit` and `npx prettier --check` after each batch;
`prettier/prettier` is an **error** and will fail the ratchet immediately. When
tightening an exported type, expect the compiler to surface real callers (e.g.
`ValidationError` now takes `TIssue[]` so both `ZodIssue` and
`ZodFormattedError` payloads are accepted) — fix the callers' types rather than
widening back to `any`.

### Bugs the compiler found while removing `any`

Replacing `any` with a real type is a review in disguise. These were genuine
defects that only became visible once the types stopped lying:

- **`Employee.status` sent unvalidated.** `streamEmployeesToExcel` forwarded a
  raw `?status=` string straight into a Prisma **enum** column, so any value
  outside `Activo` / `Archivado` threw at runtime. Now narrowed with
  `toEmployeeStatus()`, which skips the filter on unrecognized input.
- **`"Licencia Médica"` was missing from `TimeRecordStatus`.** The backend does
  emit it, and `justificationType` fed it into `status`, but the frontend union
  omitted it and `TIME_RECORD_STATUS_CONFIG` had no label for it. Adding the
  member made the `Record<TimeRecordStatus, …>` exhaustiveness check fire, which
  is how the missing UI entry was found.
- **`exportShiftScheduleToICS` could crash.** It called `event.startTime.split(…)`
  although `startTime` is optional in `IcsShiftEvent`. Events missing a bound are
  now skipped.
- **Query params were cast, not checked.** `as string` on `req.query` values
  lets `?area[a]=b` through as an object. Added `queryString()` in
  `backend/src/utils/stringUtils.ts`; prefer it over `as string` on query values.

### Known upstream escape hatch

`backend/src/controllers/ImportController.ts` keeps one narrow
`as unknown as XlsxLoadBuffer` cast. exceljs ships an ambient
`interface Buffer extends ArrayBuffer` that shadows Node's real `Buffer` and
rejects it outright — even a direct `as Buffer` fails. The type is derived via
`Parameters<ExcelJS.Xlsx["load"]>[0]` so it survives an exceljs upgrade. This is
the **only** sanctioned cast; do not add others without the same justification.

---

## 5. Route Guards & API Contract

Both route-introspection guards used to pass **vacuously**. Express 5 removed
`layer.regexp` and leaves `layer.path` `undefined` for mounted routers, so
`app._router.stack` no longer resolves and the route list was always empty.

1. **Declare mounts, do not rediscover them.** `src/app.ts` exports
   `ROUTE_MOUNTS` (`{ prefix, router }[]`). `tests/helpers/routeManifest.ts`
   joins those prefixes with each router's own routes. Never walk
   `app._router`/`app.router` to recover prefixes again.
2. **`/api/health` is mounted separately** in `app.ts` because it must bypass
   the global rate limiter and the maintenance gate. It still appears in
   `ROUTE_MOUNTS` so guards see it.
3. **Detect `validate` with a marker, not `fn.name`.** The middleware factory
   returns anonymous arrows, so the runtime name is `middleware`. Use
   `isValidateMiddleware()` from `backend/src/middleware/validate.ts`.
4. **Anti-vacuity assertions are mandatory.** Any guard that enumerates
   collections must assert the collection is non-empty, otherwise a broken
   enumerator silently passes forever.
5. **OpenAPI paths must match the mount prefix exactly.** `@openapi` blocks
   were written as `/api/emails`, `/api/configs`, `/api/exports` while the
   routers mount at `/api/email`, `/api/configs`, `/api/export`. Documented
   paths are now singularized and the `api-contract` guard enforces it.
6. **Keep the contract in sync.** `npm run check:sdk` (backend) regenerates
   `docs/swagger.json` and `frontend/src/types/api-schema.ts` and fails if
   either changes. It runs inside `validate:ci`. Its `FRONTEND_DIR` used to be
   `Frontend` (capital F), which made the command unrunnable on Linux.
7. **Validation ratchet.** `tests/architecture-guard.test.ts` compares the
   unvalidated mutating routes against `ALLOWED_UNVALIDATED_ROUTES`. Each
   baseline entry is justified inline (no JSON body, path-only, or multipart
   with a controller-side parse). Adding an unvalidated route fails until it is
   validated or justified.

### Ratchet baselines

Both are set to zero. Raise them only with a deliberate, explained edit:

| Ratchet                     | File                                                                 | Enforced by                                                                     |
| --------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| ESLint warnings             | `lint-budget.json`                                                   | `validate:ci`, pre-commit, CI                                                   |
| Unvalidated mutating routes | `ALLOWED_UNVALIDATED_ROUTES` in `tests/architecture-guard.test.ts`   | `test:unit`                                                                     |
| Coverage thresholds         | `coverage` en `backend/vitest.config.ts` y `frontend/vite.config.ts` | `verify-backend` (`test:coverage`) y `verify-frontend` (`validate:ci:coverage`) |

Coverage, docs y smoke (spec 003, ADR-0012):

- Cobertura: `npm run test:coverage` en cada paquete (vitest `--coverage`,
  thresholds como ratchet: solo suben).
- Docs: `npm run docs:check` desde la raíz (enlaces + índice ADR).
- Smoke: `npx playwright test e2e/smoke.spec.ts` en `frontend/` contra
  `compose.staging.yaml` (ver `README.md` §5).

Cobertura, docs y e2e (spec 004/005, ADR-0016):

- Suite e2e completa pre-release: `npm run e2e:staging` en `frontend/`
  contra `compose.staging.yaml` (workers 4 local, 1 en CI; el proyecto
  `perf` corre dependiente y en serie).
- Carga baseline: `npm run load:staging` en `backend/` (Artillery;
  tokens se obtienen fuera del escenario para no chocar con el
  rate-limit de login).
- Accesibilidad: `frontend/e2e/a11y.spec.ts` gatea 0 críticas con
  `@axe-core/playwright`; contraste serio queda como backlog hasta
  decisión de paleta.
- Tokens de rol `Usuario` expiran ~2 min por diseño (quiosco): no
  alargar el fallback de `AuthService`. Ver ADR-0016.
- `compose.staging.yaml` exige `--env-file .env.staging` siempre.

---

## 6. Commit Discipline (Humans and Agents, including Jules)

`release-please` parses the subject with `tipo(scope opcional): mensaje`.
The type must be at position 0. Emoji prefixes (`🔒 Fix ...`,
`⚡ perf: ...`) break parsing and silently skip the release notes entry.

1. Pure Conventional Commits subjects, no emoji, no extra prefixes.
2. The `commit-msg` hook (`scripts/commit-conventional.cjs`) enforces this
   locally. Do not bypass it with `--no-verify`.
3. History already contains emoji-prefixed subjects (grandfathered, see
   spec 003 G-01). Do not imitate them.

---

## 7. Dependency Maintenance Cadence (Dependabot is disabled)

Monthly lightweight sweep, one validated commit per package batch:

```bash
# 1. From the repo root, list drift per package
(cd backend && npm outdated)
(cd frontend && npm outdated)
```

1. Apply **minor/patch only** via `npm update <pkg>` (never bare `npm update`).
2. Majors are one migration each: validate (`validate:ci` backend,
   `validate:ci:coverage` frontend), commit, push, then next.
3. After every push: `gh run list --limit 3` and confirm CI green before
   stacking more work (gates fail fast, e.g. `spec:check` syntax).
4. Never run both packages' validations in parallel: backend `check:sdk`
   rewrites `frontend/src/types/api-schema.ts` mid-run and produces a
   phantom prettier failure in the frontend job.
5. Standing holds (retry when the blocker lifts, do not force):
   - `typescript@7`: `typescript-eslint` refuses TS 7.0 (support tracked
     for TS >=7.1); also needs `moduleResolution: node10` removal.
   - `prisma@8`: RC only, no stable release.
   - `@babel/plugin-transform-runtime@8`: conflicts with workbox-build's
     babel 7 tree (pinned at v7 deliberately, see vite 8 migration).
   - `@types/exceljs`: `latest` (0.5.3) is lower than installed (1.3.2);
     `wanted` already equals `current`, nothing to do.
