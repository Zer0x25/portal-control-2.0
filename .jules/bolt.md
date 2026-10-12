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
1. Cache TypeScript source ASTs and module configs across architectural tests in `holidays-architecture.test.ts`.
2. Keep `openapi-typescript` in backend `devDependencies` and prepend backend's `.bin` to PATH in `verify-sdk-sync.ts`, eliminating `npm ci` for frontend in `verify-backend`.
3. Mount `/var/lib/postgresql` as `--tmpfs` in `run-fastify-isolated.cjs` with tuned memory settings.
4. Trigger `docker pull postgres:18.4-alpine &` in the background after checkout.

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
1. Remove `inline-css`, lazy-load React Query Devtools behind devMode flag, and eliminate unused packages (`jspdf`, `jspdf-autotable`), dropping `index.html` from 216 KB to 1.7 KB (-99.2%).
2. Apply surgical `React.lazy` + `Suspense` to offscreen modals (`ShiftHandoverModal`, `DeveloperPanel`, `UserManualModal`, `ChangePasswordModal`, etc.) and sub-tabs (`PatternManager`, `AssignmentManager`, `LeaveManager`, `HolidayManager`), reducing `TheoreticalShifts` chunk from 98.4 kB to 5.6 kB (-94.3%) and `PersistentLayout` from 70 kB to 37.4 kB (-46.5%).
3. Replace `framer-motion` in the shell and atomic dashboard cards with native Tailwind v4 GPU transitions and native touch handlers (`onTouchStart`/`onTouchEnd`), cutting vitest execution time from 62.8s to 49.7s (-20.8%).
4. Remove orphaned Zustand `timeRecordSlice` and redundant state stores.

## 2026-10-11 - Duplicate Punch POSTs from Rapid Clicks + Double Error Toasts
**Learning:** Two fast taps fired two POSTs to `/api/records/punch` before React re-rendered `disabled`, and each failure toasted twice (mutation `onError` + caller `catch`), so one business denial (e.g. ON_LEAVE) appeared as two identical errors.
**Action:** Guard critical mutation handlers with a synchronous `isSubmittingRef` (early return while in flight, release in `finally`) and give the error toast a single owner (`suppressErrorToast: true` in `mutateAsync` variables + early-return in `onError`); the caller `catch` prefers the backend business-denial message and reserves the generic text for network failures.


## 2026-10-11 - Optimize duplicate useMemo filtering
**Learning:** Found instances where large arrays were being filtered identically multiple times across different `useMemo` hooks (e.g. `processedEmployees` and `hasNextPage`), causing O(N) operations to run twice on every search term change.
**Action:** Extract the expensive, redundant filter operations into a separate `useMemo` hook first (e.g. `filteredBaseList`), and then let dependent values use the pre-filtered result, effectively cutting the calculation time in half.

## 2026-10-12 - Frontend Bundle P0: advancedChunks, Dead Deps, AboutModal Lazy
**Learning:** Staging (gateway 127.0.0.1:8080) measured healthy baselines: login FCP ~480ms / LCP ~800ms, dashboard LCP ~1.8s (buffered observer; an unbuffered late observer falsely reported 6.2s), CLS 0.01, 0 longtasks. Three findings: (1) legacy `manualChunks(id)` let Rolldown's shared JSX runtime fall inside the `charts` chunk, so the entry preloaded chart.js (~143KB raw / ~54KB gzip) on every boot although it is only used behind `React.lazy` (AttendanceChart); `framer-motion`/`axios` had 0 imports in `src` (already tree-shaken, dead weight in package.json/lockfile/install); (2) `Sidebar.view.tsx` imported `AboutModal` eagerly (rule-3 violation; it rode inside the `PersistentLayout` chunk); (3) `GET /api/configs/public/company-policy` 404s once per session when no policy is configured (expected state, memoized, cosmetic Chrome network log).
**Action:** (1) Migrate `frontend/vite.config.ts` to Rolldown-native `advancedChunks` groups (commits `62c5e53`, `210e471`, `3b3402c`): entry JS graph 684KB -> 570KB raw (-17%), wire gzip JS+CSS ~284KB -> ~253KB (-11%), `charts-*` verified on-demand in staging (canvas renders, HTTP 200, 0 pageerrors). Remove `framer-motion` + `axios` deps and 11 residual `vi.mock("framer-motion")` blocks. Lazy-load `AboutModal` (`PersistentLayout` 39.9KB -> 34.2KB). Deferred P1 backlog (retomar al final): `date-utils` (38KB) + `zod` (89KB) eager via `useStore` slices (`dashboardSlice` -> `formatters` -> `date-fns-tz`, `indexedDB`/`schemas`); `audit-logs` 1.5s in dashboard waterfall (backend); `kpis/overview` 183KB payload; brotli in nginx (~15-20% wire extra); preload `Inter-Regular.woff2` (fonts ~377KB transfer, discovered late via CSS); backend 200-null instead of 404 for missing optional `company-policy`; pre-existing `KioskView.test.tsx` failure (fails on clean tree, likely time-dependent, Sunday run missing "Inicio Jornada").

## 2026-10-12 - Worker Portal Full-Dump: Scope Records Query to Employee+Month
**Learning:** `juan.perez` (role Usuario) loading `#/worker-portal` fetched `GET /api/records` with `pageSize: -1` and empty filters (1,737,326 bytes decoded, 259ms in staging), then filtered by employee+month client-side — the entire DB history on every login. Backend already supports server-side `employeeId`/`desde`/`hasta` (`TimeRecordQuerySchema` -> Prisma `where.date {gte/lte}` + auto-scope by role Usuario) but the frontend never sent them; worker-portal was the only `pageSize: -1` caller. Latent bug found while gating: the employee-resolution effect cancelled its own in-flight `resolveEmployeeLink` via the effect cleanup (`setIsResolvingEmployeeLink(true)` re-renders -> cleanup sets `cancelled=true` before the awaits resolve), hanging the portal in "loading" forever whenever the store path missed — invisible before because the unscoped fetch masked it.
**Action:** (commit `f1f2eef`) Add `enabled` gate to `useTimeRecords`/`useTimeRecordsQuery` (never sent to backend); `useWorkerPortalData` queries `filters: {employeeId, desde, hasta}` for the selected month with `enabled: !!employee?.id`, derives punch status from `useUserClockingStatus(employeeId)` (1 row, valid across month boundaries); fix the self-cancelling resolution effect (drop closure `cancelled`, `hasTried` ref already guarantees single flight; React 18 unmounted setState is no-op). Staging verified as `juan.perez`: `records?...&employeeId=EMP001&desde=2026-10-01&hasta=2026-10-31` -> 5,564 bytes / 71ms + status row 1,432 bytes / 71ms; total API payload ~1.9MB -> 34,770 bytes (-98%), 0 pageerrors, 9/9 hook tests (2 new: scoped-params + disabled-without-employee).
