# Spec 117: Corregir flujo `tablero-kpis-y-supervision`

- **Estado:** En progreso (Fase 3 — SDD)
- **Fecha:** 2026-11-18
- **Flujo asociado:** [docs/flows/tablero-kpis-y-supervision.md](../../docs/flows/tablero-kpis-y-supervision.md)
- **Decisiones del usuario:** `1.B; 2.A; 3.A`

## 1. Contexto y alcance

Tras la documentación AS-IS y la replicación controlada (Fase 2) sobre `#/dashboard`, `#/dashboard-supervisor`, `/api/kpis/*` y `/api/export/*`, se confirmaron 6 defectos técnicos (`BUG-01..06`) y se resolvieron 3 decisiones de negocio (`DUDA-01..03`).

### Alcance incluido

1. **DUDA-01 (`1.B`) — Acceso de `Fiscalizador` en UI y API:**
   - Quitar acceso de `Fiscalizador` (`ROLES.AUDITOR`) a `#/dashboard-supervisor` en `frontend/src/App.tsx` y al enlace `Supervisión` en `frontend/src/hooks/layout/sidebarMenu.ts`.
   - Mantener `/api/kpis/*` restringido a `["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"]` en backend.
   - Mantener `#/dashboard` fuera del alcance de `Supervisor` y `Fiscalizador`.
2. **DUDA-02 (`2.A`) — Archivados con actividad en rango y filtro `workdayType`:**
   - En `KpiReportService` (`POST /api/kpis/summary`, `POST /api/kpis/detailed-report` y exportaciones que delegan en él), incluir empleados con `status !== "Activo"` **únicamente si tienen registros (`TimeRecord`), permisos/licencias (`Leave`) o turnos/planificación asignada (`ShiftAssignment` / `ShiftPattern`) dentro del rango consultado**; excluir archivados/inactivos sin actividad ni planificación en ese período.
   - Mantener `GET /api/kpis/overview`, `GET /api/kpis/daily-planning` y `GET /api/export/calendar-pdf` filtrando `status: "Activo"`.
   - Soportar y propagar el filtro `workdayType` desde `ReportsTab` (`useReportsTabController`) hacia `POST /api/kpis/detailed-report`, `GET /api/export/report-pdf` y `GET /api/export/report-excel`, y aplicarlo en backend sobre los empleados evaluados.
3. **DUDA-03 (`3.A`) — Fuera de alcance en Spec 117:**
   - Mantener `GET /api/kpis/overview` y `GET /api/kpis/daily-planning` globales (sin segmentación por área para `Supervisor`).
   - Dejar `AnalyticsTab` (`useAnalyticsTabController.ts`) fuera del alcance funcional de esta spec.
4. **BUG-01 — Propagación de errores en `prepareExcel`:**
   - En `backend/src/modules/importExport/application/flows.ts`, `prepareExcel` debe propagar `AppError` (incluyendo `ForbiddenError` 403 y `ValidationError` 400) sin envolverlos en `500 EXPORT_REPORT_EXCEL_ERROR`.
5. **BUG-02 — Unificación de `mode` en exportación y OpenAPI SDK:**
   - Alinear `ExportQuerySchema` (`backend/src/models/schemas/time-correction.schemas.ts`) y `ControllerExportQuerySchema` (`exportFilters.schemas.ts`) con los modos soportados (`"summary" | "compiled_detailed"`), evitando discrepancias 400/500 tardías.
   - Exponer `mode` (y `workdayType`, `cargo`) en la definición OpenAPI / Swagger consumida por el SDK frontend (`npm run check:sdk`), eliminando el cast `as never` en `frontend/src/services/kpiService.ts`.
6. **BUG-03 — Horas extra negativas en meses cerrados:**
   - En `KpiStatsService.ts`, al leer `dailyBreakdown` de meses cerrados (`monthlyEmployeeStats`), aplicar `Math.max(0, Number(day.overtime || 0))` igual que en meses abiertos para que un déficit diario nunca reste horas extra acumuladas.
7. **BUG-04 — Conteo y detalle de permisos especiales:**
   - En `KpiAggregationService.ts`, acumular días con `status === "Permiso" || status === "Permiso Especial"` en `specialPermitCount` y `specialPermitRecords` (junto con `justifiedAbsenceDays`), de modo que `specialPermitRate` y `justifiedAbsenceRate` en `KpiFormattingService` reflejen los permisos especiales reales.
8. **BUG-05 — Visibilidad de errores en `KpisTab`:**
   - Exponer `error` e `isError` en `useKpiCalculations.ts` y manejar fallos de `POST /api/kpis/summary` en `useKpisController.ts` / `KpisTab.tsx` mostrando notificación (toast) y estado de error explícito en pantalla en lugar de mostrar métricas en `0` bajo `"PERIODO SIN REGISTROS"`.
9. **BUG-06 — Filtros ignorados en KPIs y Exportación:**
   - En `createKpiFlows.normalize` (`backend/src/modules/kpis/application/flows.ts`), honrar `employeeId` singular (convirtiéndolo en `employeeIds: [employeeId]` si `employeeIds` no se envió) y `departmentId` (usándolo como `area` si `area` no se envió), además de `workdayType`.
   - En `ExportService.generateDetailedReportPDF` y `StreamExportService.streamKpiReportToExcel` (e `importExportFlows`), propagar `cargo` y `workdayType` al cálculo de reporte detallado.

## 2. Criterios de aceptación

- `Fiscalizador` no ve `Supervisión` en el sidebar y es redirigido fuera de `#/dashboard-supervisor` en frontend; en backend `/api/kpis/*` sigue respondiendo `403`.
- `GET /api/export/report-excel` responde `403` ante `ForbiddenError` (ej. `Usuario` solicitando otro empleado) y `400` ante `ValidationError`.
- `?mode=detailed` es rechazado consistentemente con `400` por validación Fastify (`ExportQuerySchema` alineado con `ControllerExportQuerySchema`), y `kpiService.ts` envía `mode` sin `as never` tras `check:sdk`.
- Un empleado `Archivado` sin actividad ni turnos en el rango queda excluido de `POST /api/kpis/summary` y `detailed-report`, pero sí se incluye si tuvo registros, permisos o turnos en ese rango.
- En meses cerrados y abiertos, una jornada con déficit diario produce `0` horas extra (nunca negativa).
- Los registros con `Permiso Especial` o `Permiso` incrementan `specialPermitCount`, `specialPermitRate` y `kpiDetails.specialPermitRecords`.
- En `KpisTab`, un fallo `500` de `POST /api/kpis/summary` muestra alerta de error explícita y toast, nunca `"PERIODO SIN REGISTROS"`.
- `ReportsTab` envía `workdayType` tanto en `POST /api/kpis/detailed-report` como en `GET /api/export/report-pdf` y `report-excel`, y backend filtra correctamente por `employeeId`, `departmentId`, `cargo` y `workdayType`.
