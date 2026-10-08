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


