# Tasks 117: Corregir flujo `tablero-kpis-y-supervision`

## Tareas Backend (`backend-kpis-export`)

- [x] **T-117-B1:** Actualizar `KpiSummaryRequestSchema`, `ExportQuerySchema` y `ControllerExportQuerySchema` (`workdayType`, `mode` unificado a `"summary" | "compiled_detailed"`).
- [x] **T-117-B2:** Corregir `createKpiFlows.normalize` para mapear `employeeId` -> `employeeIds`, `departmentId` -> `area` y propagar `workdayType` / `cargo`.
- [x] **T-117-B3:** Actualizar `KpiReportService` para incluir empleados archivados/inactivos solo cuando tengan `TimeRecord`, `Leave` o turno/planificación en el rango consultado, y filtrar por `cargo` y `workdayType`.
- [x] **T-117-B4:** Corregir `KpiStatsService` (clamp `Math.max(0, ...)` en meses cerrados) y `KpiAggregationService` (acumular `Permiso` y `Permiso Especial` en `specialPermitCount` y `specialPermitRecords`).
- [x] **T-117-B5:** Corregir `prepareExcel` en `importExport/application/flows.ts` para propagar `AppError` (403/400) y propagar `cargo` + `workdayType` a `generateDetailedReportPDF` y `streamKpiReportToExcel`.
- [x] **T-117-B6:** Actualizar/añadir tests en `kpis.test.ts`, `importExport.test.ts`, `kpiFlows.test.ts`, `KpiAggregationService.test.ts` y verificar `check`, `lint`, `check:sdk` y suites aisladas.

## Tareas Frontend (`frontend-kpis-dashboard`)

- [x] **T-117-F1:** Retirar acceso de `Fiscalizador` a `#/dashboard-supervisor` en `App.tsx` y `sidebarMenu.ts`.
- [x] **T-117-F2:** Exponer `isError` / `error` en `useKpiCalculations.ts` y mostrar alerta/toast explícito en `useKpisController.ts` / `KpisTab.tsx` ante fallo de `/api/kpis/summary`.
- [x] **T-117-F3:** Propagar `workdayType` desde `useReportsTabController.ts` a `getDetailedReport`, `downloadReportPDF` y `downloadReportExcel`; preparar `kpiService.ts` sin `as never`.
- [x] **T-117-F4:** Actualizar y añadir tests unitarios/integración en `KpisTab.spec.tsx`, `useReportsTabController.test.ts`, `useKpiCalculations.test.tsx`, `kpiService.contract.test.ts` y roles/sidebar.

## Sincronización, Staging y Cierre (Coordinador + `verifier-kpis`)

- [x] **T-117-S1:** Integrar ramas de `backend-kpis-export` y `frontend-kpis-dashboard`, regenerar OpenAPI/SDK (`npm run check:sdk` y `test:schemas-refactor`) y validar `lint:budget` `0/0` y `docs:check`.
- [x] **T-117-S2:** Reconstruir `portal-control-staging` (`compose.staging.yaml`) y verificar con `verifier-kpis` en Playwright (`http://127.0.0.1:8080`).
- [x] **T-117-S3:** Actualizar `docs/flows/tablero-kpis-y-supervision.md` y `docs/flows/_index.md` a `SINCRONIZADO_Y_VERIFICADO` (`0` bugs, `0` dudas) y hacer commit final.
