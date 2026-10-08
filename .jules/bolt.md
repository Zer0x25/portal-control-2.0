## 2026-03-19 - N+1 Query in TimeRecord Enrichment
**Learning:** The `TimeRecordService.enrichRecord` method relies on `schedulingService.getEmployeeDailyScheduleInfo` to calculate real-time KPIs. When `enrichRecord` is called in a loop (e.g., in `listRecords` or `listRecordsForExport`), it causes an N+1 query problem if a `SchedulingContext` is not provided, making list/export operations severely slow on large datasets (up to 20,000 records).
**Action:** Always batch-fetch dependencies using `schedulingService.getSchedulingContext` for the required date range and unique employee IDs before mapping over collections of records, and pass the context down to `enrichRecord`.

## 2026-10-08 - Await in loops blocking Event Loop
**Learning:** In `backend/src/services/kpi/KpiReportService.ts`, `getDailyPlanningSummary` executed `await schedulingService.getEmployeeDailyScheduleInfo()` inside a sequential `for...of` loop, causing N+1 latency even with cached contexts.
**Action:** Use `Promise.all()` with `Array.map()` to execute asynchronous operations concurrently inside loops when no sequential dependency is present.
