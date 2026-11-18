# Flujo: Tablero, KPIs y supervisión (`tablero-kpis-y-supervision`)

- **Estado:** `AS_IS_DOCUMENTADO` — Fase 1 completada sobre código actual; pendiente replicación controlada (Fase 2).
- **Última actualización:** 2026-11-18
- **Módulos / actores:** `dashboard`, `supervisor-dashboard`, `kpis`, `importExport`, `records`, `config`. Operadores previstos en UI/API: `Administrador`, `Supervisor_Elevado`, `Supervisor`, `Reloj_Control` y `Fiscalizador` (con divergencia UI vs API detallada en sección 3).
- **Entradas:** UI `#/dashboard`, `#/dashboard-supervisor` (tabs `dashboard`, `kpis`, `analytics`, `employees`, `reports`, `shifts`); API `POST /api/kpis/summary`, `POST /api/kpis/detailed-report`, `GET /api/kpis/overview`, `GET /api/kpis/daily-planning`, `GET /api/export/report-pdf`, `GET /api/export/report-excel`, `GET /api/export/calendar-pdf`.
- **Alcance de evidencia:** código del checkout actual (`backend` y `frontend`). En Fase 1 no se ejecutaron pruebas ni se observaron respuestas HTTP o navegador; las anomalías registradas deben replicarse y confirmarse en Fase 2.

## 1. Diagrama AS-IS

```mermaid
flowchart TD
  A["Rutas protegidas #/dashboard y #/dashboard-supervisor"] --> B["Overview y Daily Planning"]
  B --> C["GET /api/kpis/overview y /api/kpis/daily-planning"]
  A --> D["Tab Indicadores (KpisTab)"]
  D --> E["POST /api/kpis/summary"]
  E --> F["KpiReportService -> KpiStatsService (cache mensual cerrado o calculo abierto)"]
  A --> G["Tab Reportes (ReportsTab)"]
  G --> H["POST /api/kpis/detailed-report"]
  G --> I["Exportar PDF/Excel servidor (GET /api/export/report-pdf y report-excel)"]
  I --> J["importExportFlows -> ExportService / StreamExportService (rate limit 10/15m)"]
  A --> K["Tab Analytics -> GET /api/records/daily-attendance"]
  A --> L["Tab Turnos -> accounting_lock_date y pre-cache"]
```

## 2. Comportamiento observado en código

### 2.1 Acceso, navegación y permisos por rol

- `frontend/src/App.tsx` y `frontend/src/router/ProtectedRoute.tsx` protegen `#/dashboard` (solo montada si `isControlInternoEnabled` es verdadero) para `Reloj_Control`, `Administrador` y `Supervisor_Elevado`, y `#/dashboard-supervisor` para `Supervisor`, `Administrador`, `Supervisor_Elevado` y `Fiscalizador`.
- `frontend/src/hooks/layout/sidebarMenu.ts` oculta `Inicio` (`#/dashboard`) a `Supervisor` y `Fiscalizador`, y muestra `Supervisión` (`#/dashboard-supervisor`) a `Fiscalizador` además de los roles elevados.
- En backend (`backend/src/modules/kpis/http/routes.ts`), todas las rutas `/api/kpis/*` aplican `onRequest: [options.authenticate, supervisor]`, donde el middleware `supervisor` solo autoriza `Administrador`, `Supervisor_Elevado`, `Supervisor` y `Reloj_Control`. `Fiscalizador` queda excluido en API aunque la UI le permita entrar a `#/dashboard-supervisor`.
- En `frontend/src/hooks/useSupervisorPermissions.tsx` y `frontend/src/types/supervisor.ts`, `SupervisorRole` solo contempla `"Supervisor" | "Supervisor_Elevado"`. En `frontend/src/features/dashboard/components/widgetRegistry.ts`, los widgets incluyen `"Supervisor"` en `ALL_DASHBOARD_ROLES` aunque la ruta `#/dashboard` lo excluye.
- En `backend/src/platform/fastify/app.ts`, las rutas `/api/kpis*` y `/api/export*` devuelven `503 MAINTENANCE_MODE` durante mantenimiento activo, y `/api/export*` tiene un rate limit por IP de `10` peticiones cada `15` minutos antes de autenticación y mantenimiento.

### 2.2 `#/dashboard`, Overview y Daily Planning

- `DashboardContainer` (`frontend/src/features/dashboard/containers/Dashboard.container.tsx`) y `DashboardView` (`Dashboard.view.tsx`) renderizan widgets de `WIDGET_REGISTRY` filtrados por `module === "controlInterno"`, rol y visibilidad móvil, consumiendo `useDashboardData` (`useControlInternoEnabledQuery`, `useReportsQuery` y `useDashboardOverviewQuery`).
- `OverviewTab` y `LiveStatusPanel` (`frontend/src/features/supervisor-dashboard/`) consultan `GET /api/kpis/overview` y filtran en cliente por estado de marcaje y búsqueda por nombre.
- `KpiReportService.getDashboardOverview` (`backend/src/services/kpi/KpiReportService.ts`) consulta empleados `Activo` y registros de `yesterdayStr..todayStr` en horario de Chile (`America/Santiago` via `toBusinessDateChile` / `addBusinessDaysChile`), clasifica estados (`en_jornada`, `en_colacion`, `en_jornada_post_colacion`, `terminada`, `jornada_terminada_anomalia`, `no_programado`, `ausente`, `por_iniciar`) y detecta anomalías (turnos abiertos >14h, `AnomaliaManual` y faltas de marcaje de ayer sin licencia ni feriado).
- `GET /api/kpis/daily-planning` ejecuta `KpiReportService.getDailyPlanningSummary`, que resume empleados `Activo` para el día actual en Chile (`onVacation`, `onMedicalLeave`, `onSpecialPermit`, `onDayOff`, `scheduled`, `activeCount`). Ninguno de los dos endpoints soporta filtros por área ni alcance por supervisor.

### 2.3 Indicadores KPI, cálculo y caché mensual

- `KpisTab` y `useKpisController` (`frontend/src/features/supervisor-dashboard/`) permiten elegir rango por mes, trimestre, semestre, año o personalizado y filtros en cascada (`workdayType -> area -> employeeId`). Al cambiar fechas se resetean los filtros y la consulta se dispara manualmente mediante `useKpiCalculations` (`POST /api/kpis/summary`). En caso de error en la query no hay toast explícito en `useKpisController`.
- En backend (`backend/src/modules/kpis/application/flows.ts`), `createKpiFlows.normalize` valida el rango con `KpiSummaryRequestSchema` (`backend/src/models/schemas/core.schemas.ts`), transforma a rango exclusivo y limita el intervalo a 1 año (o 5 años cuando `employeeIds` tiene exactamente 1 elemento).
- `KpiReportService.getKpiSummary` y `getDetailedReport` obtienen `sourceRevision` desde 64 stripes (`kpiSourceRevision`), cargan empleados y precargan en paralelo `schedulingService.getSchedulingContext`, `timeRecord.findMany`, `systemConfig("accounting_lock_date")` y `monthlyEmployeeStats` en bloques de 3 meses.
- `KpiStatsService.calculatePeriodStats` (`backend/src/services/kpi/KpiStatsService.ts`) recorre mes a mes: si `kpiCache.isMonthLocked` es verdadero lee `monthlyEmployeeStats` o materializa con `ensureMonthlyCache` (upsert fuera de transacción); si el mes está abierto calcula por tramos de 10 días con `KpiEngine.calculateDailyMetrics` (tolerancia de atraso de 15 minutos, exención de `Artículo 22`, descuento de colación real o programada, tope de horas extra en turnos `>= 11h`).
- `KpiAggregationService` y `KpiFormattingService` consolidan totales, tasas y listas (`tardyRecords`, `absentEmployees` sanitizado con `toPublicEmployee`, `vacationRecords`, `medicalLeaveRecords`).

### 2.4 Reportes detallados y exportación PDF / Excel

- `ReportsTab` (`useReportsTabController.ts`) solicita `POST /api/kpis/detailed-report` al pulsar Generar. Aunque `ReportFilterPanel` ofrece filtro `workdayType` para acotar las listas desplegables, `useReportsTabController` solo envía `startDate`, `endDate`, `area` y `employeeIds` al reporte y a las exportaciones.
- La exportación de tabla local a PDF está deshabilitada con toast informativo; la exportación servidor usa `GET /api/export/report-excel` y `GET /api/export/report-pdf` (`mode: "summary" | "compiled_detailed"` cuando es reporte grupal, casteado `as never` en `kpiService.ts` porque el cliente OpenAPI generado no expone `mode`).
- En backend (`backend/src/modules/importExport/http/routes.ts` y `application/flows.ts`):
  - `ExportQuerySchema` (`backend/src/models/schemas/time-correction.schemas.ts`) valida query en Fastify, pero `importExportFlows` vuelve a validar con `ControllerExportQuerySchema` (`exportFilters.schemas.ts`).
  - `ExportService.generateDetailedReportPDF` (`backend/src/services/export/ExportService.ts`) y `StreamExportService.streamKpiReportToExcel` (`StreamExportService.ts`) delegan a `kpiService.getDetailedReport`.
  - Para rol `Usuario`, los endpoints de exportación restringen la consulta al propio `employeeId` del actor.

## 3. Anomalías, brechas y riesgos para replicación

1. **[ANOMALÍA-01] `Fiscalizador` admitido en UI pero bloqueado con `403` en API KPI.** `App.tsx:276-281` y `sidebarMenu.ts:49` permiten a `Fiscalizador` acceder a `#/dashboard-supervisor`, pero `backend/src/modules/kpis/http/routes.ts:13-25` restringe `/api/kpis/*` al middleware `supervisor` (`Administrador`, `Supervisor_Elevado`, `Supervisor`, `Reloj_Control`).
2. **[ANOMALÍA-02] `prepareExcel` convierte `403`/`400` en `500 EXPORT_REPORT_EXCEL_ERROR`.** En `backend/src/modules/importExport/application/flows.ts:64-76`, el `try/catch` de `prepareExcel` atrapa `ForbiddenError` (ej. `Usuario` solicitando otro `employeeId`) y `ValidationError` y responde `500` genérico en lugar de propagar el error de dominio.
3. **[ANOMALÍA-03] Desajuste en `mode=detailed` entre Fastify y el flujo de exportación.** `ExportQuerySchema` (`time-correction.schemas.ts:304`) acepta `"detailed"`, mientras `ControllerExportQuerySchema` (`exportFilters.schemas.ts:11`) solo permite `["summary", "compiled_detailed"]`, provocando fallo tardío (`400` en PDF, `500` en Excel). Además el cliente SDK en `frontend/src/services/kpiService.ts:111-112` usa `as never` para pasar `mode`.
4. **[ANOMALÍA-04] Filtros aceptados por contrato pero ignorados en cálculo/exportación.**
   - `KpiSummaryRequestSchema` acepta `employeeId` y `departmentId`, pero `createKpiFlows.normalize` (`modules/kpis/application/flows.ts:7,18`) los descarta y solo reenvía `employeeIds` y `area`.
   - `ExportQuerySchema` acepta `cargo` y `mode`, pero `generateDetailedReportPDF` y `streamKpiReportToExcel` ignoran `cargo` (y Excel también ignora `mode`).
   - `KpiReportService.getEmployees` (`KpiReportService.ts:363-369`) no filtra por `status: "Activo"` (posible inclusión de archivados/inactivos en KPIs/reportes según rango), a diferencia de `overview`, `daily-planning` y `calendar-pdf`.
   - `ReportFilterPanel` tiene `workdayType`, pero no se propaga al backend ni en `detailed-report` ni en exportaciones.
5. **[ANOMALÍA-05] Posible diferencia de horas extra entre meses cerrados y abiertos.** `KpiEngine.calculateDailyMetrics` (`KpiEngine.ts:136`) puede producir `overtimeHours < 0`. En meses abiertos `KpiStatsService.ts:146` aplica `Math.max(0, day.overtime)`, pero en meses cerrados (`KpiStatsService.ts:112`) suma `Number(day.overtime || 0)` directo desde `dailyBreakdown`, permitiendo que días con déficit resten horas extra acumuladas.
6. **[ANOMALÍA-06] `specialPermitCount` / `specialPermitRecords` / `specialPermitRate` siempre en 0.** `KpiAggregationService.ts:15,25,43-60` y `KpiFormattingService.ts:29` declaran métricas de permisos especiales pero `aggregateEmployeeSummary` nunca clasifica días con permiso especial.
7. **[ANOMALÍA-07] Alcance por área de `Supervisor` y manejo de errores en `KpisTab`.** `GET /api/kpis/overview` y `GET /api/kpis/daily-planning` no filtran por área asignada del `Supervisor`, y `useKpisController` no muestra feedback visual (toast/alerta) cuando falla `POST /api/kpis/summary`.
8. **[ANOMALÍA-08] Cache miss en meses cerrados fuera de transacción y `AnalyticsTab` con arrays vacíos.** `KpiStatsService.ts:102,168-216` materializa `monthlyEmployeeStats` por empleado sin transacción en cache miss; en frontend `useAnalyticsTabController.ts:1-9` devuelve `heatmapData = []` y `trendData = []` estáticos.
