## 2026-03-19 - N+1 Query in TimeRecord Enrichment

**Learning:** The `TimeRecordService.enrichRecord` method relies on `schedulingService.getEmployeeDailyScheduleInfo` to calculate real-time KPIs. When `enrichRecord` is called in a loop (e.g., in `listRecords` or `listRecordsForExport`), it causes an N+1 query problem if a `SchedulingContext` is not provided, making list/export operations severely slow on large datasets (up to 20,000 records).
**Action:** Always batch-fetch dependencies using `schedulingService.getSchedulingContext` for the required date range and unique employee IDs before mapping over collections of records, and pass the context down to `enrichRecord`.

## 2026-10-08 - Verify Backend CI Optimization

**Learning:** `verify-backend` was taking ~4m 21s due to four compounding bottlenecks:

1. `tests/holidays-architecture.test.ts` re-parsed the entire `src/` AST for each of the 20 module boundary tests (>2,000 passes), consuming ~26s in CI.
2. `verify-backend` installed the complete 722-package frontend dependency tree purely to run `openapi-typescript` for SDK sync verification, invalidating the backend npm cache on frontend lockfile bumps.
3. Disposable PostgreSQL in integration testing ran against standard container overlayfs on CI virtual disks without memory-backed tmpfs.
4. Docker pulled `postgres:18.4-alpine` serially at the integration step rather than pre-fetching in background.
   **Action:**
5. Cache TypeScript source ASTs and module configs across architectural tests in `holidays-architecture.test.ts`.
6. Keep `openapi-typescript` in backend `devDependencies` and prepend backend's `.bin` to PATH in `verify-sdk-sync.ts`, eliminating `npm ci` for frontend in `verify-backend`.
7. Mount `/var/lib/postgresql` as `--tmpfs` in `run-fastify-isolated.cjs` with tuned memory settings.
8. Trigger `docker pull postgres:18.4-alpine &` in the background after checkout.

## 2026-10-08 - Await in loops blocking Event Loop

**Learning:** In `backend/src/services/kpi/KpiReportService.ts`, `getDailyPlanningSummary` executed `await schedulingService.getEmployeeDailyScheduleInfo()` inside a sequential `for...of` loop, causing N+1 latency even with cached contexts.
**Action:** Use `Promise.all()` with `Array.map()` to execute asynchronous operations concurrently inside loops when no sequential dependency is present.

## 2026-10-08 - Frontend Initial Paint, Chunk Splitting & Animation Overhead

**Learning:** The frontend suffered from 4 compounding performance and latency bottlenecks:

1. Vite `inline-css` inlined 214 KB of compiled CSS directly into `index.html` (216 KB total), completely defeating HTTP/2 caching, immutable hashes, and Workbox PWA caching.
2. Heavy modals and feature tab managers were imported synchronously, ballooning chunk sizes (`TheoreticalShifts` was 98.4 kB, `PersistentLayout` was 70 kB).
3. `framer-motion` (126 kB) was heavily coupled to the application shell (`PersistentLayout`, `Header`, `TopLoadingBar`, `Card`, `MetricCard`, `KpiCard`, `ActionButton`, `DashboardSkeleton`) purely for basic `opacity: 0 -> 1` and `y: 5` animations, generating intense JS reconciler/RAF overhead across hundreds of DOM nodes.
4. Redundant Zustand slices (`timeRecordSlice`) duplicated server data and memory consumption alongside TanStack Query.
   **Action:**
5. Remove `inline-css`, lazy-load React Query Devtools behind devMode flag, and eliminate unused packages (`jspdf`, `jspdf-autotable`), dropping `index.html` from 216 KB to 1.7 KB (-99.2%).
6. Apply surgical `React.lazy` + `Suspense` to offscreen modals (`ShiftHandoverModal`, `DeveloperPanel`, `UserManualModal`, `ChangePasswordModal`, etc.) and sub-tabs (`PatternManager`, `AssignmentManager`, `LeaveManager`, `HolidayManager`), reducing `TheoreticalShifts` chunk from 98.4 kB to 5.6 kB (-94.3%) and `PersistentLayout` from 70 kB to 37.4 kB (-46.5%).
7. Replace `framer-motion` in the shell and atomic dashboard cards with native Tailwind v4 GPU transitions and native touch handlers (`onTouchStart`/`onTouchEnd`), cutting vitest execution time from 62.8s to 49.7s (-20.8%).
8. Remove orphaned Zustand `timeRecordSlice` and redundant state stores.

## 2026-10-11 - Duplicate Punch POSTs from Rapid Clicks + Double Error Toasts

**Learning:** Two fast taps fired two POSTs to `/api/records/punch` before React re-rendered `disabled`, and each failure toasted twice (mutation `onError` + caller `catch`), so one business denial (e.g. ON_LEAVE) appeared as two identical errors.
**Action:** Guard critical mutation handlers with a synchronous `isSubmittingRef` (early return while in flight, release in `finally`) and give the error toast a single owner (`suppressErrorToast: true` in `mutateAsync` variables + early-return in `onError`); the caller `catch` prefers the backend business-denial message and reserves the generic text for network failures.

## 2026-10-11 - Optimize duplicate useMemo filtering

**Learning:** Found instances where large arrays were being filtered identically multiple times across different `useMemo` hooks (e.g. `processedEmployees` and `hasNextPage`), causing O(N) operations to run twice on every search term change.
**Action:** Extract the expensive, redundant filter operations into a separate `useMemo` hook first (e.g. `filteredBaseList`), and then let dependent values use the pre-filtered result, effectively cutting the calculation time in half.

## 2026-10-14 - Await in loops blocking Event Loop (KpiStatsService)

**Learning:** `calculateRangeMetrics` in `backend/src/services/kpi/KpiStatsService.ts` was executing `await schedulingService.getEmployeeDailyScheduleInfo()` inside a sequential `while` loop over dates. This caused a severe N+1 latency bottleneck and event loop blocking when calculating stats across long date ranges.
**Action:** Use chunked `Promise.all()` to execute asynchronous lookups concurrently inside loops. Be sure to chunk the inputs (e.g., 10 at a time) rather than firing thousands of promises simultaneously to prevent database pool exhaustion while still yielding an immense speedup.

## 2026-10-13 - Missing Marks Lookup Contention

**Learning:** The method in used a sequential `for...of` loop that awaited schedule lookups one-by-one to check for missing marks from the previous day, creating a severe N+1 latency delay on the event loop for large employee subsets.
**Action:** Always extract and parallelize independent queries inside list iterations by collecting candidate IDs, pre-fetching results concurrently with `Promise.all`, mapping them to a `Map`, and then performing synchronous lookups inside the iteration.

## 2026-10-12 - Frontend Bundle P0: advancedChunks, Dead Deps, AboutModal Lazy

**Learning:** Staging (gateway 127.0.0.1:8080) measured healthy baselines: login FCP ~480ms / LCP ~800ms, dashboard LCP ~1.8s (buffered observer; an unbuffered late observer falsely reported 6.2s), CLS 0.01, 0 longtasks. Three findings: (1) legacy `manualChunks(id)` let Rolldown's shared JSX runtime fall inside the `charts` chunk, so the entry preloaded chart.js (~143KB raw / ~54KB gzip) on every boot although it is only used behind `React.lazy` (AttendanceChart); `framer-motion`/`axios` had 0 imports in `src` (already tree-shaken, dead weight in package.json/lockfile/install); (2) `Sidebar.view.tsx` imported `AboutModal` eagerly (rule-3 violation; it rode inside the `PersistentLayout` chunk); (3) `GET /api/configs/public/company-policy` 404s once per session when no policy is configured (expected state, memoized, cosmetic Chrome network log).
**Action:** (1) Migrate `frontend/vite.config.ts` to Rolldown-native `advancedChunks` groups (commits `62c5e53`, `210e471`, `3b3402c`): entry JS graph 684KB -> 570KB raw (-17%), wire gzip JS+CSS ~284KB -> ~253KB (-11%), `charts-*` verified on-demand in staging (canvas renders, HTTP 200, 0 pageerrors). Remove `framer-motion` + `axios` deps and 11 residual `vi.mock("framer-motion")` blocks. Lazy-load `AboutModal` (`PersistentLayout` 39.9KB -> 34.2KB). Deferred P1 backlog (retomar al final): `date-utils` (38KB) + `zod` (89KB) eager via `useStore` slices (`dashboardSlice` -> `formatters` -> `date-fns-tz`, `indexedDB`/`schemas`); `audit-logs` 1.5s in dashboard waterfall (backend); `kpis/overview` 183KB payload; brotli in nginx (~15-20% wire extra); preload `Inter-Regular.woff2` (fonts ~377KB transfer, discovered late via CSS); backend 200-null instead of 404 for missing optional `company-policy`; pre-existing `KioskView.test.tsx` failure (fails on clean tree, likely time-dependent, Sunday run missing "Inicio Jornada").

## 2026-10-12 - Worker Portal Full-Dump: Scope Records Query to Employee+Month

**Learning:** `juan.perez` (role Usuario) loading `#/worker-portal` fetched `GET /api/records` with `pageSize: -1` and empty filters (1,737,326 bytes decoded, 259ms in staging), then filtered by employee+month client-side — the entire DB history on every login. Backend already supports server-side `employeeId`/`desde`/`hasta` (`TimeRecordQuerySchema` -> Prisma `where.date {gte/lte}` + auto-scope by role Usuario) but the frontend never sent them; worker-portal was the only `pageSize: -1` caller. Latent bug found while gating: the employee-resolution effect cancelled its own in-flight `resolveEmployeeLink` via the effect cleanup (`setIsResolvingEmployeeLink(true)` re-renders -> cleanup sets `cancelled=true` before the awaits resolve), hanging the portal in "loading" forever whenever the store path missed — invisible before because the unscoped fetch masked it.
**Action:** (commit `f1f2eef`) Add `enabled` gate to `useTimeRecords`/`useTimeRecordsQuery` (never sent to backend); `useWorkerPortalData` queries `filters: {employeeId, desde, hasta}` for the selected month with `enabled: !!employee?.id`, derives punch status from `useUserClockingStatus(employeeId)` (1 row, valid across month boundaries); fix the self-cancelling resolution effect (drop closure `cancelled`, `hasTried` ref already guarantees single flight; React 18 unmounted setState is no-op). Staging verified as `juan.perez`: `records?...&employeeId=EMP001&desde=2026-10-01&hasta=2026-10-31` -> 5,564 bytes / 71ms + status row 1,432 bytes / 71ms; total API payload ~1.9MB -> 34,770 bytes (-98%), 0 pageerrors, 9/9 hook tests (2 new: scoped-params + disabled-without-employee).

## 2026-10-12 - Supervisor Analytics: Parallelize Records Pagination, Aggregate Endpoint Pending

**Learning:** Opening the Analytics tab (`#/dashboard-supervisor`, admin) fired 9 sequential `GET /api/records` paginated dumps (~700KB each, ~5.8MB total) because `useAttendanceAnalytics` looped `pageSize: 500` with `await` per page to compute 30 daily aggregates (+ heatmap/trend stubs). `kpis/overview` (183KB, already fetched) is a team-status snapshot, not a daily series, so it cannot replace the loop client-side. Kiosk profile measured clean (LCP 576ms, 2 APIs, 44KB, 0 errors) — no action there.
**Action:** (commit `62c096c`) Fetch page 1 first (reveals `totalPages`, identical call shape), then `Promise.all` pages 2..N (order preserved). Staging: pages 2-9 dispatch same-ms, records wall ~800ms+ -> 627ms, chart renders, 0 pageerrors, 5/5 tests (1 new: concurrent-pages order). Bytes unchanged by design — real fix is backend `GET /api/records/daily-attendance?desde&hasta` returning ~30 pre-aggregated rows (needs `api-contracts-sync` + SDK regen), logged as P1 follow-up.

## 2026-10-12 - FIX: daily-attendance Aggregate Endpoint (Analytics 5.8MB -> 1.7KB)

**Learning:** `useAttendanceAnalytics` paginated the full `/api/records` dump (9 x ~700KB, ~5.8MB) to compute 30 daily aggregates client-side; `kpis/overview` is a team snapshot, not a daily series, so no client reuse was possible. Schema stores `scheduledStartTime` per row, so the server can mirror the client fallback exactly (same 5 absent statuses, same 15-min tolerance via existing `getMinutesFromMidnightChile`/`parseTimeToMinutes`) with one indexed query and zero scheduling calls (no N+1); only documented drift is schedule-edited-after-punch.
**Action:** (commits `9199248` backend + `f012399` frontend, skill `api-contracts-sync` completa) New `GET /api/records/daily-attendance?desde&hasta&employeeId?` (trailing-30d default): zod `DailyAttendanceQuerySchema` + `DailyAttendanceRow/Response` schemas, `TimeRecordService.dailyAttendance` (single `findMany` with minimal select + in-memory buckets + zero-filled days, same Usuario/Kiosk role scoping as `listRecords`), flows wrapper + `recordFlows` wiring, route with query validator, OpenAPI block, routeContracts manifest (asserted at boot — staging booted healthy), swagger snapshot regen (solo agregados, +135/-0), SDK regen (`check:sdk` OK), frontend `timeRecordService.getDailyAttendance` + hook rewrite (dead client aggregation deleted, -273/+118), 3+3 new tests. Staging verified: endpoint 200/1,685 bytes/140ms (admin 30d), Usuario auto-scoped, parity EXACTA vs client logic on real data (3/3 days), tab Analytics: 9 dumps -> 1 request 1,687 bytes/103ms, click->canvas 1418ms -> 896ms, 0 pageerrors.

## 2026-10-12 - FIX: audit-logs Waterfall 1.2s -> 18ms (Exact Action + Composite Index)

**Learning:** Every dashboard load fires `useProactiveDetectionsQuery` from `Header -> NotificationCenter -> useNotifications` (global shell, plus 5-min refetch): `severity=CRITICAL + action=DETECCION_BLOQUEO_PROACTIVA`, pageSize 5. Backend mapped `action` to `{contains, insensitive}` which cannot use any btree index; with 629k rows in `audit_logs` (mostly LOGIN_SUCCESS) each poll did a seq scan + count in ~1.1-1.5s for an empty result. Schema had no index on `severity`/`action` at all. All `action` values are enum-like constants and the only callers sending `action` (`useProactiveDetectionsQuery`, closure-history `CONFIG_SET`/`CIERRE_*`) already send exact strings; `AuditLogsView` does not filter by `action` — so exact equality changes no real behavior.
**Action:** (commit backend + migración `20261012032323`, skill `prisma-migration-safeguard`: precheck OK, SQL auditado — solo 3 `CREATE INDEX`, sin DDL destructivo) `@@index([severity, action])` en `AuditLog` + `where.action = action` exacto en `AuditService.getAuditLogs`; test de integración `action=edit -> EDIT` (el anterior fijaba la semántica lenta). La migración también resolvió drift preexistente: el schema ya declaraba índices de `assigned_shifts` y `time_records (employee,date)` nunca migrados (este último acelera además `daily-attendance`). Staging (`migrate deploy` en boot, healthy): query proactiva 1.2s -> ~18ms (3/3 runs 11-23ms), `total:0` correcto, waterfall dashboard 58ms/88 bytes, 0 pageerrors, `tsc`/`prettier` OK. Nota deploy: `CREATE INDEX` no-concurrente bloquea escrituras segundos en tablas grandes — en prod, ventana de bajo tráfico. Follow-up: `actor` sigue `contains-insensitive` (solo página de gobernanza, no waterfall).

## 2026-10-12 - FIX: kpis/overview 165KB -> 31KB (Slim de Contrato)

**Learning:** `GET /api/kpis/overview` (waterfall del dashboard + tab Overview supervisor) devolvía 165KB: `employeeStatuses` con `employee` completo de 12 campos vía `toPublicEmployee` (89KB — rut, email, PIN-block, timestamps que nadie lee) + `lastRecord` enriquecido sin ningún consumidor (el tipo frontend ni lo declara) + `teamStatus.anomalies` con 195 filas sintéticas MISSING-* (~61KB, justification.comment idéntico repetido 195×) cuyo único uso real es `.length` para el badge (ambos modales son placeholders "se mostrarán aquí"). El propio tipo backend `DashboardStatus` ya declaraba `employee: {id, name, position}` — la implementación lo contradecía.
**Action:** (commits `3793c69` backend + `4f49d43` frontend, lockstep) Backend: `employee -> {id, name, position}`, elimina `lastRecord` del output y su campo en `DashboardStatus`, `anomalies[] + presentRecords[] -> anomaliesCount` (cómputo interno intacto para el conteo); importa `toPublicEmployee` removido. Tests integración actualizados al contrato (shape exacto vacío, keys de employee, `status: en_jornada`, `anomaliesCount` 1/0 por escenario) y verificados 20/20 contra Postgres local efímero (`compose.db.dev.yaml`, base `pweb3_test` con guard, migrado + apagado después). Frontend: `TeamStatus`/`TeamStatusData` con `anomaliesCount` (+ `anomalies?` opcional como fallback en la ventana de despliegue), hook expone `anomaliesCount`, panel y defaults actualizados, 1 test nuevo (fallback legado). Sin cambio OpenAPI (el schema zod no cubría esos campos) ni migración. Staging: 165,656 -> 31,032 bytes (-81%), 65ms, panel + supervisor renderizan, 0 pageerrors, `tsc`/`eslint`/`prettier` OK ambos lados.

## 2026-10-12 - FIX: date-fns-tz + zod Fuera del Boot (2 Cortes Frontend)

**Learning:** `index.html` preloadeaba `date-utils` (38.6KB raw/11KB gzip) y `validation/zod` (89KB raw/25KB gzip) en boot por dos bordes del store global: `dashboardSlice -> formatters -> date-fns-tz` (una sola llamada en un handler de modal, no en boot) y `slices -> indexedDB -> zod+schemas` (validación solo en writes). En el camino aparecieron dos mecanismos fantasma: (1) Workbox precacheaba 174 archivos (todo lo no ignorado) e inflaba las mediciones de red — se probó con `sw.js` bloqueado para medir el grafo real; (2) `ForceChangePasswordModal` montado siempre vía barrel `features/auth` arrastraba `useUsers -> useEmployees -> dateUtils` al grafo (detectado por traza de chunks, no por grep).
**Action:** (commits `4ddb0ca` + `43a5719`) Corte 1: `utils/chileClock.ts` (Intl nativo `h23`/`America/Santiago`, paridad 56 casos incl. DST/medianoche + test de 2 casos), `dashboardSlice` deja `formatters`, `ForceChangePasswordModal` con montaje condicional, `date-utils/dateUtils/formatters` fuera del precache. Corte 2: `utils/idbValidation.ts` (schemaMap + validadores verbatim, dynamic `import()` cacheado en writes), `validation/idbValidation` fuera del precache; mock global de `setup.ts` extendido con `STORES` literales (el mock sin STORES rompía el top-level del módulo lazy — causó el único fallo intermedio). Staging verificado: cold boot 28 archivos sin `date*` ni `validation`, login renderiza, dashboard carga `validation` bajo demanda (sync writes OK), panel renderiza, 0 pageerrors; entry sin imports estáticos a ambos (verificado por grep al bundle); suite completa 378/379 (único fallo = `KioskView` preexistente en árbol limpio). `tsc`/`eslint`/`prettier` OK.

## 2026-10-12 - FIX: Gateway Gzip a JSON (API en Identidad -> Comprimido)

**Learning:** El backend ya comprime (`@fastify/compress`, verificado directo al contenedor: magic bytes gzip), pero por el gateway las APIs viajaban en identidad: el gateway no reenvía `Accept-Encoding` al upstream (probado con `wget` desde el contenedor gateway: con header el backend gzipea, sin header identidad) y su `gzip_types` no incluía `application/json` — así que ni comprimía él ni dejaba comprimir. El frontend/nginx propio sí tenía la lista completa (JS/CSS ya iban gzip). Payloads <1024B quedan en identidad por `gzip_min_length` por diseño (login 500B, overview-seed 213B).
**Action:** (commit `2f5cdd9`) `nginx/nginx.conf`: `gzip_types` + `application/json, application/manifest+json, image/svg+xml, font/woff2`, `gzip_comp_level 6`, `buffers 16 8k`, `http_version 1.1` (misma imagen `nginx:alpine` de prod — brotli real requeriría build custom con `ngx_brotli`, descartado). Staging verificado: `daily-attendance` 1591B -> 168B wire (-89%, `content-encoding: gzip`, payload decodifica a 30 filas intactas), JS sigue gzip, login + health 200.

## 2026-10-12 - FIX: Preload Inter-Regular (Fuente Descubierta Tarde vía CSS)

**Learning:** Las 5 fuentes (~415KB) iban hasheadas en `/assets/` con caché immutable y fuera del precache SW (correcto), pero el navegador las descubría tras parsear el CSS — el primer paint de texto esperaba ~110KB. Moverlas a `public/` con URL estable habría roto el hashing immutable; mejor inyectar el preload con la URL hasheada en build. Medido además: gzip sobre woff2 ahorra 0.3% (352B de 110KB) — no se toca la compresión de fuentes, solo se documenta.
**Action:** (commit frontend) Plugin `fontPreloadPlugin` en `vite.config.ts` (`transformIndexHtml` + `ctx.bundle`, solo `Inter-Regular-*`, `as=font crossorigin`, `head-prepend`): mantiene hashing immutable, solo preloadea Regular (pesos 400/500 del cuerpo; SemiBold/Bold/RobotoMono llegan por CSS sin competir con el JS crítico). Staging verificado: `index.html` servido trae el preload con hash correcto, fuente 200 `font/woff2` + `immutable`, boot la trae primera (24ms), login renderiza, dashboard no suma fuentes nuevas, 0 pageerrors. `tsc` OK (eslint ignora `vite.config.ts` por config del repo).

## 2026-10-12 - FIX: company-policy 404 -> 200-null (Contrato + SDK)

**Learning:** `GET /api/configs/public/company-policy` devolvía 404 cuando no hay reglamento (estado esperado de config opcional) — un 404 cosmético por sesión en consola. El frontend ya mapeaba `!ok -> null`, pero con 200-null el `response.json()` da `null` y el spread `{...null}` + `policy.url` lanzaba TypeError (contenido por el try/catch, pero igual había que blindarlo). De paso se detectó drift latente: `api-contract.test.ts` fallaba en árbol limpio desde el commit `9199248` (el snap no incluía los schemas `DailyAttendance*` — el `check:sdk` no lo cubre porque solo compara swagger.json vs SDK).
**Action:** (commits backend + frontend lockstep, skill `api-contracts-sync` completa) Backend: ruta retorna `policy() ?? null` (200); OpenAPI `nullable: true` + descripción (soportado por el generador); test pasa de `status 404` a `200 + body null`; `docs:generate`; snapshots `-u` (absorbe además el drift DailyAttendance). Frontend: `sdk:generate` (diff mínimo: descripción + `| null`), guard `if (!policy) return null`, `check:sdk` OK. Staging (rebuild backend+frontend, migraciones en boot): JSON 200 `null` (4B), `/file` sigue 404 (correcto: descarga real), dashboard sin ningún 4xx de company-policy, panel renderiza, 0 pageerrors. Backend 67/67 en `dataConfigs` (PG local efímero, apagado después); `tsc`/`eslint` OK ambos lados.

## 2026-10-12 - NO-ACTION: Filtro `actor` de Audit-Logs (Medido, UX Manda)

**Learning:** El follow-up pedía endurecer `actor contains-insensitive` como se hizo con `action`. Pero los casos difieren: `action` no lo filtraba ninguna UI (enum exacto, cambio seguro); `actor` es el input libre "Buscar por usuario..." de `AuditLogFilterPanel` (debounce 500ms) — la subcadena ES la feature (escribir "juan" debe hallar "juan.perez"). Match exacto rompería la búsqueda parcial en silencio. Medido en staging: filtro `actor=juan` + mes acotado + página 50 responde en 15-30ms; la query proactiva del waterfall no usa `actor`; la vista siempre acota por mes y pagina (50), y el export tiene hard limit 10k — peor caso acotado en interacción manual de admin, nunca en waterfall.
**Action:** Ninguna (decisión documentada, no churn). Si alguna vez duele a escala, la receta que preserva UX es índice GIN trigram (`CREATE EXTENSION pg_trgm` + `USING gin (actor_username gin_trgm_ops)` vía migración Prisma con SQL crudo, ventana de bajo tráfico por bloqueo de escrituras) — no `where.actorUsername = actor`.

## 2026-10-12 - FIX: KioskView Test Rojo (Bug Real a11y, No Flaky Horario)

**Learning:** Se asumía flaky dependiente de la hora (nota original: "Sunday run missing Inicio Jornada"), pero es determinista: `Button.tsx:87` copia `title -> aria-label` (fallback para botones icon-only como el FAB "Nuevo Registro"), y `Kiosk.view` pone `title="No disponible"` en acciones deshabilitadas — el `aria-label` pisa el texto visible y los lectores oyen 4 botones idénticos "No disponible" en vez de cada acción. Usuarios de lector de pantalla no podían distinguirlas. El único otro `Button` con `title` es el FAB (solo icono: el fallback ahí sí es correcto).
**Action:** (commit `fix(frontend)`, con aprobación humana exigida por la cabecera UI-PROTECTED de `Kiosk.view`) `aria-label={action.label}` explícito en los botones de acción — el spread `{...props}` de Button lo respeta, el tooltip visual se conserva. El test EXISTENTE pasa sin modificarse (prueba de que el test era correcto y el bug era prod). Suite completa 378/379 -> 379/379. Staging: kiosco renderiza (paso RUT), 0 pageerrors. `tsc`/`eslint` OK.

## 2026-10-13 - CERT: Full CI Verde + Drift de Route Guard Absorbido

**Learning:** La certificación halló un segundo drift latente del commit `9199248` (igual que el snap de `api-contract`): `routeContracts.ts` registraba `GET /api/records/daily-attendance` pero el enumerador de `fastifyRouteContracts.test.ts` no — "Records route manifest differs" tumbaba 17 tests en cascada en árbol limpio. Patrón: ese commit regeneró `swagger.json` pero no los artefactos derivados que lo referencian (snaps, enumeradores).
**Action:** (commit `test(backend)`) 1 línea: ruta en el enumerador (auth+validado, verificado en `records/http/routes.ts`). Certificación completa: preflight iteración + pre-PR OK; backend `validate:ci` EXIT 0, `test:unit:ci` 58/58 (421 tests), `test:api:integration` 20/20 (406 tests, Node 26 vía fnm); frontend `validate:ci` EXIT 0 (94 files, 379 tests); raíz `secrets:scan`, `spec:check` (30), `docs:check` (199 md), `lint:budget` 0/0. Nota: `test:api:integration` exige Node 26 (`fnm` tiene `v26.10.0` en `installation/bin`).

## 2026-10-13 - FIX: brand-logo 404 -> 200-null (Hermano de company-policy)

**Learning:** Mismo patrón: `GET /api/configs/public/brand-logo` 404 cuando no hay logo — y este dispara incluso en el login anónimo (`useBrandLogoQuery` sin gate de token, `retry: false` ya documentaba que el 404 era esperado). Más simple que company-policy: el frontend ya tolera `null` (`if (!logo...) return null`), sin cambio de código frontend — solo SDK.
**Action:** (commits backend + frontend-SDK lockstep, skill `api-contracts-sync`) Backend: `brandLogo() ?? null`, OpenAPI `nullable: true` + descripción, 2 tests actualizados (incluido el de reseteo a null en spec027 que fijaba el segundo 404), `docs:generate`, snaps `-u` (limpios esta vez, solo brand-logo). Frontend: solo `sdk:generate` (`| null` + descripción), `check:sdk` OK. Staging: JSON 200 `null`, `/file` sigue 404, login sin 4xx de brand-logo, 0 pageerrors. `dataConfigs` 67/67 en PG efímero (apagado después); `tsc`/`eslint` OK.

## 2026-10-21 - perf(core): Chunked TimeRecord Enrichment

**Learning:** En map() statements on massive arrays (like potentially up to 20,000 for exports or -1 page sizes in TimeRecordService), resolving all items concurrently via Promise.all starves the Node.js event loop leading to timeouts and unresponsiveness. Using a chunked iteration mechanism yielding with setImmediate correctly mitigates event loop blocks for long-running calculations.
**Action:** Use a deterministic chunked iteration with await Promise.all() when evaluating huge un-paginated arrays and inject await new Promise(resolve => setImmediate(resolve)) to yield control back to the event loop.

## 2026-10-23 - perf(frontend): Defer Dashboard Time Control Modals

**Learning:** `Dashboard.container` imported two closed modal containers through the `time-control` barrel, pulling the full `TimeControl.container` route chunk and its dependencies into Dashboard's cold load. The original single Lighthouse result with TBT 2.670 s was not reproducible; three clean-storage runs exposed cold FCP/LCP as the repeatable issue.
**Action:** Load `QuickActionModal` and `EditTimestampModal` directly with `React.lazy` and mount them only when opened. The integrated three-run cold profile cut median total transfer 7.0%, script transfer 8.8%, and requests by 25; FCP/LCP medians improved 5.3%/9.2%. TBT varied across repeat groups, so do not infer a stable improvement yet. Keep the cold Dashboard profile in `perf:staging`; investigate the still-blocking 35.9 KB stylesheet next. The staging seed had no eligible present-without-schedule row to exercise opening the modal.

## 2026-10-23 - perf(frontend): Latin Font Subsets

**Learning:** Four full font files consumed ~379 KB (45% of Dashboard cold transfer). FontTools subsets with disjoint Unicode ranges preserve Spanish glyph outlines/metrics while original files serve other alphabets on demand. The stylesheet row's ~901 ms duration did not imply savings: its global Lighthouse FCP/LCP savings were zero.
**Action:** Keep immutable originals, pinned generation and hash guards, subset preload and one-year caching. Deployed font transfer fell 68.4% and total transfer 30.7%; the eight-weight specimen is pixel-identical. Three cold samples showed FCP/LCP 4.383/6.218 s versus 4.247/6.246 s before, so do not claim a stable timing improvement. Next investigate initial JavaScript/render cost, not font bytes again. Fix Puppeteer waitForFunction argument order (function, options, arguments): absent shell must never pass readiness; retain final-URL verification and failed runs. Evidence: specs/040-frontend-font-subsets/evidencia/resultado-2026-10-23.md.

## 2026-10-23 - perf(frontend): Deferred Dashboard Forms and Reports

- **Cambio**: notas y visor de reportes lazy desde Dashboard, conservando borradores tras el primer montaje. Query, Form, Table/Virtual y sanitización separados para evitar imports opcionales por vendor.
- **Medido**: 3 cargas frías por versión: JS 409,696 → 304,922 B (−25.6%), total 575,671 → 470,917 B (−18.2%), LCP mediano 6,218 → 5,508 ms (−11.4%), FCP 4,383 → 3,785 ms. Score 63 → 68; TBT con rangos solapados. Perfil local: 84 → 76 scripts.
- **Validación**: 24 tests enfocados, flujo real notas/reporte/impresión, batería 18 rutas + 17 Lighthouse + 3 fríos, presupuestos intactos. Se corrigió navegación doble del helper; se añadió gate de umbrales por hash (LHCI agrupaba por finalUrl sin fragmento). Reportes existentes revalidados: 17 rutas, 85 aserciones aprobadas; cuatro regresiones Node.
- **Límites/siguiente**: laboratorio local y método del preparador corregido; no atribución causal aislada ni CWV de campo. Precache conserva funcionalidades. Próximo foco: consultas de kiosco/catálogos y refetches de sincronización observados en boot. Evidencia: [spec 041](../specs/041-dashboard-deferred-modals/evidencia/resultado-2026-10-23.md).

## 2026-10-23 - perf(frontend): Deduplicar consultas al iniciar Dashboard

- **Learning**: `useEmployees()` activaba `/api/employees/kiosk` para cualquier pantalla, y `runSync` invalidaba queries recién cargadas al restaurar sesión. Eso repetía usuarios, empleados, catálogos, configuración y turnos.
- **Cambio**: la query de kiosco solo se habilita con `useEmployees(true)`. El sync habitual solo refresca queries activas stale y coalesce fetches en curso; al detectar otra instancia de BD conserva la invalidación forzada para vaciar la caché lógica anterior.
- **Medido**: captura Dashboard en staging, 32 → 21 requests API (−34,4%); rutas repetidas 11 → 1 y requests kiosk 2 → 0. Repetición del test conservó 21. Queda `/api/health` dos veces entre la validación de instancia y el indicador. Dashboard readiness: mediana 529ms, 3 muestras.
- **Validación**: 7 tests unitarios, 4 E2E enfocados (notas + tres escenarios offline), request gate 1/1; batería completa 6/6 Playwright, 18 rutas, Lighthouse 17/17 destinos con 85/85 aserciones, y 3 muestras frías. Build y budgets pasan; imagen de staging `sha256:51e1866eff3c5987eebc655801175014f6d70d71c2f57e76cd6707c4dbd3cd8f`.
- **Límites/siguiente**: el conteo anterior es CDP con ventana de 1.500ms y el nuevo Playwright con 800ms de quietud; reducción observada en una captura por versión. Lighthouse no mejora de forma estable: LCP 5.508 → 5.599s, score 0,68 → 0,67 y requests totales 89 → 89; no atribuir efecto temporal a la reducción API. Próximo paso: compartir de forma segura la lectura `/api/health` y revisar el orden/criticidad de las 20 rutas restantes. Evidencia: [spec 042](../specs/042-dashboard-query-startup-deduplication/evidencia/resultado-2026-10-23.md).

## 2026-10-23 - perf(frontend): Compartir validación de health en Dashboard

- **Learning**: La validación de `instanceId` podía iniciar su propio `/api/health` además del indicador. `fetchQuery` con la key/opciones canónicas y `staleTime: 0` comparte la lectura en vuelo sin aceptar una respuesta cacheada como validación fresca. Se preservaron fallback fail-safe y limpieza por mismatch.
- **Medido**: 3 arranques secuenciales en staging: 21 → 20 solicitudes API (−4,76%), endpoint repetido 1 → 0 y health 2 → 1; 20/20 respuestas HTTP 200 por muestra. `main-content` visible a 577 ms y `server-clock` a 675 ms de mediana. Imagen `sha256:7d004a0bf3e1261d3aaeea2aeee9609628902185b999d8dc23da98fa027731b3`.
- **Lighthouse y siguiente foco**: score/FCP/LCP/TBT/CLS medianos 0,71 / 3.747 ms / 5.416 ms / 94,5 ms / 0. Es diagnóstico post-rebuild; no atribuimos cambios de Lighthouse a la deduplicación API. El candidato LCP fue el texto del reloj de `WelcomePanel` con 4.966 ms de render delay mediano; `react-core` reporta 31.958 bytes JS no usado estimado y 952 ms de CPU mediano. CSS fila: 900 ms estimados, pero 0 ms de ahorro global; no priorizarlo. Investigar render inicial, trabajo de JS y gates de carga de datos. Evidencia: [spec 043](../specs/043-dashboard-health-query-deduplication/evidencia/resultado-2026-10-23.md).

## 2026-10-23 - perf(frontend): Mostrar antes la bienvenida del Dashboard

- **Learning**: `Dashboard.view` ocultaba el reloj de `WelcomePanel` detrás de la carga de overview/reportes, aunque el panel no usa esos datos. Al mostrarlo pronto, el reloj DOM apareció antes de que terminasen ambas consultas en una de tres capturas; esa marca de Playwright no garantiza una pintura más temprana.
- **Cambio**: mantener `WelcomePanel` y el spinner durante la carga inicial; widgets y modales siguen sin montarse hasta que overview/reportes estén listos. No cambiaron endpoints ni cantidad de llamadas.
- **Medido**: tres arranques de staging; `main-content` 577 → 557 ms y reloj DOM 675 → 621 ms de mediana. Se conservaron 20 solicitudes API únicas, sin duplicados, todas HTTP 200. Imagen frontend `sha256:dd1b9226211b3d7d0bc1a7f391c2d387eb75e54acb22012f1c2bfa42f8f7b920`.
- **Lighthouse y siguiente foco**: score/FCP/LCP/TBT/CLS 0,71 / 3.760 ms / 5.423 ms / 108 ms / 0, sin cambio estable frente a spec043 y con rangos LCP solapados. El reloj sigue siendo el candidato LCP con ~4.972 ms de demora de render; `react-core` registra 974,7 ms CPU mediano y 32.280 bytes de JS no usado estimado. No atribuir a este cambio mejora de CWV. Instrumentar el costo de JavaScript/hilo principal y la competencia de consultas del shell. Evidencia: [spec 044](../specs/044-dashboard-welcome-early-render/evidencia/resultado-2026-10-23.md).

## 2026-10-23 - perf(frontend): Diferir helpers de zona horaria

- **Learning**: el Dashboard descargaba `dateUtils`, `date-utils` (date-fns-tz) y `formatters` por imports usados solo al archivar empleados o iniciar un turno, y por diferencias de días de programación que no requieren zona horaria. Un perfil CDP aislado atribuyó 105,62 ms de ejecución propia al chunk `date-utils`; el conteo E2E base fue 76 scripts.
- **Cambio**: extraer parser ISO-UTC puro para `useScheduling`; mover los imports de `dateUtils`/`formatters` a cargadores de módulo usados por las acciones. Las pruebas mantienen el formato de fecha/hora en los flujos de archivo y turno.
- **Medido**: en staging final, 74 scripts y 157.982 B transferidos por Playwright; antes 76 y 168.970 B. Lighthouse: requests 88 → 86, transferencia total 471.924 → 458.765 B, scripts 308.409 → 295.143 B. Ningún chunk de fecha/formato durante Dashboard.
- **Límites/siguiente**: score mediano 0,71 → 0,69; FCP/LCP bajaron 54/94 ms, mientras TBT/hilo principal/CPU subieron y variaron. No se demuestra mejora global ni causalidad con 3 muestras. Siguiente: cuantificar las consultas de programación que `useLoginAutomations` dispara desde el shell para roles que no ejecutan auto-inicio. Evidencia: [spec 045](../specs/045-dashboard-defer-timezone-helpers/evidencia/resultado-2026-10-23.md).

## 2026-10-24 - perf(frontend): Gatear queries de auto-inicio

- **Learning**: `useLoginAutomations` monta `useScheduling` en el layout persistente. El Dashboard del Administrador sin empleado asociado no puede ejecutar auto-inicio y no consume datos de programación.
- **Cambio**: habilitar las queries de planificación del shell solo para `Reloj_Control` con empleado o Administrador/Supervisor_Elevado asociado a un empleado de cargo `Reloj_Control`. La automatización espera la carga de asignaciones, patrones, feriados y licencias antes de finalizar el intento. Los consumidores de `useScheduling` mantienen el default habilitado.
- **Medido**: staging local, Dashboard Admin: 20 → 10 endpoints API únicos (−50%), 10 rutas eliminadas en 3/3 corridas posteriores; 10/10 respuestas restantes HTTP 200 y sin duplicados. Contenido principal mediano 567 → 565 ms y reloj 586 → 603 ms; los rangos se solapan y no se declara mejora de latencia/CWV. Evidencia: [spec 046](../specs/046-dashboard-gate-automatic-scheduling-queries/evidencia/resultado-2026-10-24.md).
- **Siguiente**: trazar el origen y necesidad de `/api/audit-logs`, `/api/corrections/stats` y `/api/notes`; priorizar solo si una condición de rol, apertura o configuración permite diferirlas sin perder notificaciones ni recordatorios.

## 2026-10-24 - perf(frontend): Quitar metadata fija del reglamento

- **Learning**: `GET /api/configs/public/company-policy` siempre devuelve `/api/configs/public/company-policy/file`; el widget ya tiene esa ruta como fallback. Las otras tres rutas remanentes tienen consumidores concretos: detecciones de integridad (`useProactiveDetectionsQuery`), avisos de correcciones (`useNotifications`) y recordatorios ambientales (`AmbientReminderManager`).
- **Cambio**: quitar el fetch de metadata y el memo de sesión del `useToolsController`; preservar `VITE_COMPANY_POLICY_URL` y el endpoint de archivo predeterminado.
- **Medido**: en tres corridas staging antes/después, solicitudes API 10 → 9 (−10%); metadata 26,52–56,73 ms → ausente; todas las respuestas restantes 200, sin duplicados. Contenido principal 564,82 → 553,08 ms y reloj 602,52 → 571,27 ms de mediana, con rangos solapados; no se declara mejora de render/CWV. Imagen `sha256:c789faa7cde0a0cf28e111c98beebbf053cb0129d286f001c386dde20828b312`.
- **Evidencia**: [Spec 047](../specs/047-dashboard-defer-company-policy-metadata/evidencia/resultado-2026-10-24.md).

## 2026-10-23 - perf(frontend): Diferir consulta de notas ambientales

- **Learning**: `AmbientReminderManager` necesita las notas solo cerca de su recordatorio (10–30 minutos); la query se puede apagar en el inicio sin retrasar la apertura del modal. Si la lectura sigue pendiente al llegar la hora, no se debe descartar el disparador.
- **Cambio**: habilitar la query un minuto antes del recordatorio y mantener habilitado el comportamiento predeterminado para Quick Notes al abrirse.
- **Medido**: en tres arranques seriales de staging, solicitudes únicas 9 → 8 (−11,1%); `/api/notes` pasó de 3/3 solicitudes (mediana 25,96 ms) a 0/3. Abrir Notas solicita la ruta bajo demanda y recibe HTTP 200. Todas las respuestas de arranque fueron 200 y no hubo duplicados. Las medianas de contenido/reloj fueron 553/571 ms antes y 583/633 ms después; los rangos se solapan y no se demuestra una mejora estable de render/CWV. Reducción acumulada desde Spec 046: 10 → 8 (−20%).
- **Evidencia**: [Spec 048](../specs/048-defer-ambient-notes-query/evidencia/resultado-2026-10-23.md). Imagen staging `sha256:90f244ed92908124a6635a82612179318c88604e57ccbdd4ce0474aaa216f534`.

## 2026-10-24 - test(perf): Batería Lighthouse multirruta

- **Medido**: 18 rutas funcionales listas; 17 Lighthouse estándar y 3 muestras frías de Dashboard, todas aprobadas. El Dashboard frío obtuvo mediana de 0,69; FCP 3.710 ms, LCP 5.330 ms, TBT 174 ms, 459.522 bytes transferidos, 295.739 bytes de scripts y 86 solicitudes. Frente al último registro previo (0,67; FCP 3.809 ms; LCP 5.599 ms; 473.684 bytes; 89 solicitudes), las cifras mejoran, pero el intervalo incluye varios cambios y no se atribuye a uno solo.
- **Gap detectado**: React core transfiere ~80 KB y concentra 0,98–1,25 s de scripting en las tres muestras frías. `useLoginAutomations` importa `useScheduling` y `useShiftManager` aunque el usuario actual no pueda usar el auto-inicio; separar esa ruta por elegibilidad puede reducir JS inicial sin cambiar el Dashboard Admin.
- **Evidencia**: [`b49d6915` — batería staging](../specs/039-frontend-performance-battery/evidencia/runs/2026-10-24T01-42-28-474Z-b49d6915.json).

## 2026-10-24 - perf(frontend): Diferir código de auto-inicio por elegibilidad

- **Learning**: deshabilitar las queries no basta para reducir el JS inicial si el layout persistente importa estáticamente sus hooks y servicios. El Admin sin empleado elegible tampoco debe descargar esos chunks.
- **Cambio**: mover el auto-inicio a `AutoStartShiftAutomation` en un chunk dinámico, montado solo cuando rol, empleado y cargo pasan la regla existente. La comprobación de entrega de turno queda en el hook del layout.
- **Medido**: en la captura Playwright Dashboard bajó de 74 a 69 solicitudes JS (−6,8 %) y de 161.774 a 150.418 B transferidos (−7,0 %); no se solicitaron chunks exclusivos de auto-inicio ni APIs de planificación. En tres muestras frías Lighthouse, score 0,69 → 0,72; FCP 3.710 → 3.642 ms; LCP 5.330 → 5.180 ms; TBT 174 → 137,5 ms; scripts 295.739 → 283.552 B; requests 86 → 81. Las 17 rutas estándar aprobaron 85/85 aserciones. Las cifras de Lighthouse son de tres muestras; conservar prudencia al atribuir cambios de tiempo.
- **Siguiente**: Lighthouse atribuye 697–829 ms de evaluación a `react-core` (218.860 B raw; 80.217 B transferidos) y estima 31.958–32.280 B no usados. El chunk contiene solo React, React DOM y Scheduler, así que perfilar el trabajo de arranque antes de intentar dividirlo. El candidato LCP es el reloj, con 1.562–1.570 ms de demora de render.
- **Evidencia**: [Spec 049](../specs/049-defer-role-specific-auto-start-code/evidencia/resultado-2026-10-24.md) y [ledger limpio](../specs/039-frontend-performance-battery/evidencia/runs/2026-10-24T02-28-24-357Z-adffe1ef.json). Imagen staging `sha256:a72d929628b12350eae8e943f276112bf1db25c19177b0efb6be3d2352a6b2b2`.

## 2026-10-24 - perf(frontend): Consolidar suscripciones del estado auth

- **Learning**: `useAuth` creaba nueve suscripciones a Zustand por llamada y `App` lo invocaba dos veces. El perfil anterior acumulaba 32,8 ms dentro del contexto `renderWithHooks`; esa muestra no era tiempo exclusivo del hook.
- **Cambio**: `useShallow` agrupa los campos conservando el contrato y una llamada en `App`; el test verifica una suscripción, reactividad y ausencia de render por cambios de tema.
- **Medido**: perfiles CPU (n=3, 4×) bajaron medianas muestreadas 7,2% en `react-core`, 4,6% en ReactDOM y 11,5% en `state`, con dispersión. Lighthouse frío (n=6) mantuvo FCP/LCP casi iguales; TBT 171 → 158,25 ms (−7,5%), sin atribución causal rígida. La segunda batería aprobó 10/10 Playwright y 85/85 aserciones en 17 rutas; se conserva una primera corrida con outlier aislado de Worker Portal.
- **Evidencia**: [resultado Spec 051](../specs/051-auth-store-subscriptions/evidencia/resultado-2026-10-24.md), [resumen CPU](../specs/051-auth-store-subscriptions/evidencia/cpu-profile-summary.json) y [ledger staging](../specs/039-frontend-performance-battery/evidencia/runs/2026-10-24T04-37-20-455Z-20a30b8c.json). Próximo foco: identificar renders/commits responsables del tiempo de `react-core`.

## 2026-10-24 - perf(frontend): Diferir tabla virtualizada de Time Control

- **Learning**: la tabla móvil estaba bajo el pliegue, pero su frontera `React.lazy` vivía dentro del componente tabla ya cargado; entrar a Control horario solicitaba de inmediato la vista móvil y el chunk compartido `tables` (53.525 B sin comprimir).
- **Cambio**: introducir `DeferredTimeRecordTable` con `IntersectionObserver`, reserva de 400 px y fallback eager cuando el observer no existe. La primera intersección deja la tabla montada.
- **Medido**: en tres muestras frías Lighthouse, JS transferido 357.482 → 296.809 B (−17,0%), transferencia total 525.073 → 462.233 B (−12,0%) y solicitudes 99 → 85. FCP/LCP simulados bajan 7,2%/7,7%; el TBT mediano sube 8,2% y el trace Chromium observado no mejora. No declarar ganancia global de CWV.
- **Siguiente**: instrumentar el render inicial de Control horario; el retraso del candidato LCP sigue cerca de 1,66 s y TBT mediano en 258 ms. Staging sin filas, de modo que no se validó virtualización con registros vivos.
- **Evidencia**: [resultado Spec 054](../specs/054-time-control-defer-virtualized-table/resultado.md) y [ledger staging](../specs/039-frontend-performance-battery/evidencia/runs/2026-10-24T08-18-04-669Z-c6f06995.json). Imagen `sha256:4e184992f8b571d59d1a716399a6baf296e4577e983efb260b92eee5cc4c0eb1`.

## 2026-10-24 - test(perf): Perfilar render inicial de Time Control

- **Método**: React Profiler en Vite dev, Node 26.10.0, Chromium 153, 412×823, tres contextos nuevos contra la API local de staging.
- **Medido**: 12 commits medianos durante el primer segundo. El árbol de ruta acumuló 64,3 ms de `actualDuration`; la vista acumuló 32,9 ms. Diferencia de scopes: 31,4 ms, atribuible por inferencia al contenedor/orquestación fuera de la vista; no es costo exclusivo de hook.
- **Límite**: El rango inicial devolvió 2 registros; no representa carga de tabla con volumen. Los tiempos de desarrollo no se comparan con Lighthouse. No se atribuye mejora CWV ni se eligió aún una optimización.
- **Siguiente**: capturar CPU de producción en esta ruta y localizar el LCP y el trabajo de `react-core` antes de cambiar lógica.
- **Evidencia**: [resultado Spec 055](../specs/055-time-control-render-profile/resultado.md) y [muestras crudas](../specs/055-time-control-render-profile/evidencia/render-profile-2026-10-24.json).
