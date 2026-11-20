# Plan 117: Corregir flujo `tablero-kpis-y-supervision`

## 1. Diseño técnico

### Backend (`backend-kpis-export`)

1. **Contratos y Schemas:**
   - `backend/src/models/schemas/core.schemas.ts`: añadir `workdayType: z.string().optional()` a `KpiSummaryRequestSchema`.
   - `backend/src/models/schemas/time-correction.schemas.ts`: alinear `ExportQuerySchema.mode` a `z.enum(["summary", "compiled_detailed"])` y añadir `workdayType: z.string().optional()`.
   - `backend/src/models/schemas/exportFilters.schemas.ts`: alinear `ControllerExportQuerySchema` añadiendo `workdayType` opcional.
2. **Orquestación KPI (`backend/src/modules/kpis/application/flows.ts` y `backend/src/services/kpi/`):**
   - `createKpiFlows.normalize`: si `employeeId` viene sin `employeeIds`, mapear a `employeeIds: [employeeId]`; si `departmentId` viene sin `area`, mapear a `area: departmentId`; propagar `workdayType`.
   - `KpiReportService.getEmployees` + `KpiReportService.getKpiSummary` / `getDetailedReport`: aceptar `cargo` y `workdayType` opcionales; filtrar empleados activos o bien archivados que tengan al menos un `TimeRecord`, `Leave` o asignación/turno dentro del rango `[startDate, endDate]`.
   - `KpiStatsService.ts`: en lectura de `monthlyEmployeeStats` (meses cerrados), usar `Math.max(0, Number(day.overtime || 0))`.
   - `KpiAggregationService.ts`: cuando `d.status === "Permiso" || d.status === "Permiso Especial"`, incrementar `specialPermitCount`, `justifiedAbsenceDays` y agregar entrada a `specialPermitRecords`.
3. **Exportación (`backend/src/modules/importExport/application/flows.ts`, `backend/src/services/export/`):**
   - `prepareExcel`: re-lanzar `AppError` sin envolver en `500 EXPORT_REPORT_EXCEL_ERROR`; mantener `excelFailure()` solo para errores inesperados no tipados.
   - `importExportFlows`, `ExportService.generateDetailedReportPDF`, `StreamExportService.streamKpiReportToExcel`: propagar `cargo` y `workdayType` hacia `kpiService.getDetailedReport`.
4. **Tests Backend:**
   - Actualizar `backend/tests/fastify-integration/importExport.test.ts` (expectativas de 403/400 en `prepareExcel` y `mode=detailed` rechazado en `ExportQuerySchema`).
   - Ampliar `backend/tests/fastify-integration/kpis.test.ts` y `tests/KpiAggregationService.test.ts` / `tests/unit/kpiFlows.test.ts` cubriendo: `employeeId`, `departmentId`, `workdayType`, archivados con vs sin actividad, horas extra >= 0 en mes cerrado y `specialPermitCount` / `specialPermitRecords`.

### Frontend (`frontend-kpis-dashboard`)

1. **Acceso `Fiscalizador` (`1.B`):**
   - `frontend/src/App.tsx`: remover `ROLES.AUDITOR` de `requiredRoles` en `#/dashboard-supervisor`.
   - `frontend/src/hooks/layout/sidebarMenu.ts`: remover el ítem `Supervisión` (`ROUTES.SUPERVISOR_DASHBOARD`) del menú de `Fiscalizador`.
   - Revisar/actualizar tests de roles (`SupervisorRole.spec.tsx` o tests de sidebar si referencian `Fiscalizador`).
2. **Visibilidad de errores en `KpisTab` (`BUG-05`):**
   - `frontend/src/hooks/useKpiCalculations.ts`: retornar `isError` y `error` de la query de TanStack Query.
   - `frontend/src/features/supervisor-dashboard/hooks/useKpisController.ts` y `components/KpisTab.tsx`: mostrar toast de error cuando falle la consulta y renderizar un banner/estado de error explícito (`role="alert"`) en lugar del mensaje de período vacío.
3. **Propagación de `workdayType` y limpieza de `as never` (`BUG-02`, `2.A`):**
   - `frontend/src/features/supervisor-dashboard/hooks/useReportsTabController.ts`: incluir `workdayType` en el payload de `getDetailedReport`, `downloadReportPDF` y `downloadReportExcel`.
   - `frontend/src/services/kpiService.ts` y `frontend/src/types/kpi-api.ts`: eliminar `as never` en llamadas de exportación una vez sincronizado el SDK OpenAPI (`npm run check:sdk` / regeneración).
4. **Tests Frontend:**
   - Cubrir error en `KpisTab` (`KpisTab.spec.tsx` / `useKpiCalculations.test.tsx`), propagación de `workdayType` en `useReportsTabController.test.ts`, bloqueo de `Fiscalizador` en `SupervisorRole.spec.tsx` o ruta/sidebar, y `kpiService.contract.test.ts`.

## 2. Coordinación de Swarm y Verificación

1. Ejecutar `backend-kpis-export` y `frontend-kpis-dashboard` en paralelo en workspaces `share` (el frontend usará inicialmente tipos locales si el SDK aún no se regenera; luego el coordinador regenera Swagger/SDK con `api-contracts-sync` y valida `check:sdk` + `form-schema-parity`).
2. Reconstruir staging (`compose.staging.yaml`) y verificar en vivo con `verifier-kpis` (Playwright headless) + cerrar `docs/flows/tablero-kpis-y-supervision.md` y `docs/flows/_index.md`.
