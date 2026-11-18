# Plan Técnico — Spec 120

## 1. Arquitectura de Cambios

### Backend (`ga-backend-fix` en `workspace: "share"`)

1. **Health & Schemas (`backend/src/platform/fastify/app.ts`, `backend/src/services/HealthService.ts`, `backend/src/models/schemas/core.schemas.ts`)**:
   - `GET /api/health` público devuelve payload mínimo (`status`, `database.status`, `responseTime`, `timestamp`, `instanceId`). Si llega sesión autenticada con rol `Administrador` (verificando sesión opcional o exponiendo detalle en `GET /api/admin/health` / `getDetailedHealth` cuando `req.user?.role === "Administrador"`), puede incluir telemetría; alternativamente, `GET /api/health` siempre mínimo público y `GET /api/admin/stats` o `GET /api/admin/health` para admin. Mejor aún: en `GET /api/health`, si hay sesión válida de `Administrador`, retornar detalle completo; si es anónimo o no-Admin, retornar payload mínimo, y definir `HealthStatusSchema` compatible con ambos (campos extendidos opcionales) + `npm run check:sdk`.
2. **Audit (`backend/src/modules/audit/http/routes.ts`, `backend/src/models/schemas/core.schemas.ts`, `backend/src/services/auditService.ts`, `backend/src/services/auditExport.ts`, `backend/src/utils/redaction.ts`, `backend/src/services/AdminService.ts`)**:
   - `POST /api/audit-logs`: cambiar `...session` por `...elevated` y relajar `AuditLogSchema` (hacer `id`, `timestamp`, `actorUsername` opcionales).
   - `redaction.ts` / `auditService.ts`: mantener `details.message` en `UNHANDLED_ERROR` (solo redactar claves sensibles y truncar stack si aplica, o redactar campos confidenciales sin reemplazar `message` por string genérico).
   - `AdminService.getSecurityInsights()`: mapear `recentAlerts` con `redactAuditFields`.
   - Reemplazar `setHours` en `auditService.ts`, `auditExport.ts`, `AdminService.ts` usando `timePolicy.ts` (`America/Santiago`).
3. **Admin / Backup / Maintenance / Seeding (`backend/src/services/backupService.ts`, `backend/src/modules/admin/application/flows.ts`, `backend/src/modules/maintenance/http/routes.ts`, `backend/src/modules/maintenance/application/flows.ts`, `backend/src/services/seedingJobService.ts`, `backend/src/services/schedulerService.ts`, `backend/src/services/runtimeJobs.ts`, `backend/src/services/maintenanceService.ts`, `backend/src/services/securityAuditService.ts`, `backend/src/services/runtimeControlService.ts`, `backend/src/services/db.ts`)**:
   - `trigger-backup`: omitir `finalPath` absoluto en respuesta HTTP (solo `filename`, `sizeBytes`, `durationMs`, etc.).
   - `backupService.ts`: parsear URL de conexión y pasar credenciales vía `env: { ...process.env, PGPASSWORD }` a `pg_dump`/`psql` (y `-h`, `-p`, `-U`, `-d`) en lugar de la URL con password en CLI args; en `restoreDatabase`, validar patrón `backup-pg-*.sql(.gz)?` y existencia lanzando `ValidationError`/`NotFoundError`.
   - `maintenance/http/routes.ts` & `seedingJobService.ts`: esquema Zod para `query` en `/seed/phase2/logs` (`jobId`, `limit`), y validación de transiciones de estado en `pause`/`resume`/`stop`.
   - `setHours` -> `America/Santiago` en `schedulerService.ts`, `runtimeJobs.ts`, `seedingJobService.ts`.
   - `console.warn`/`console.error` -> `logger` en `HealthService.ts`, `maintenanceService.ts`, `securityAuditService.ts`, `db.ts`, `runtimeControlService.ts`.

### Frontend (`ga-frontend-fix` en `workspace: "share"`)

1. **RBAC y Rutas (`frontend/src/App.tsx`, `frontend/src/features/governance/views/GovernanceHub.view.tsx`, `frontend/src/features/governance/hooks/useGovernanceData.ts`, `frontend/src/features/governance/components/IntegritySummaryView.tsx`)**:
   - `#/admin/tools` -> `requiredRoles={[ROLES.ADMIN]}`.
   - En `GovernanceHub`: filtrar pestañas por rol (`Administrador`: todas; `Supervisor_Elevado` y `Fiscalizador`: `integrity`, `audit`, `health`). Normalizar `?tab=` si el rol no tiene permiso.
   - En `IntegritySummaryView`: ocultar botón "Ejecutar Auditoría Profunda" cuando `currentUser?.role === ROLES.AUDITOR`.
   - En `SecurityInsights.view.tsx` / `useSecurityInsightsController.ts`: manejar `error` explícitamente con toast y vista de error en lugar de `return null`.
2. **Audit Logs y Modales (`useAuditLogsController.ts`, `useAuditLogMutations.ts`, `AuditLogsView.view.tsx`, `ExportLogsModal.tsx`)**:
   - Enviar `action: debouncedFilters.action` en `useAuditLogsController.ts`.
   - Leer `data.data?.message` en `useAuditLogMutations.ts`.
   - Extraer `AuditLogDesktopRow` y `AuditLogMobileRow` a nivel de módulo, añadir `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space) y renderizar `EmptyState` cuando no hay resultados.
   - Añadir `role="dialog"`, `aria-modal="true"` y listener `Escape` en `ExportLogsModal.tsx`.
3. **System Maintenance, Backups y Health (`BackupListModal.view.tsx`, `SystemMaintenance.view.tsx`, `useSystemMaintenanceController.ts`, `HealthStatusView.tsx`)**:
   - `BackupListModal.view.tsx`: agregar `group-focus-within:opacity-100` (y `opacity-100 sm:opacity-0` si corresponde) en el botón "Restaurar".
   - `SystemMaintenance` / `BackupListModal`: reemplazar `window.confirm` por `ConfirmationModal`.
   - `HealthStatusView.tsx`: soportar payload mínimo público de `/api/health` (mostrar estado DB/uptime/latencia disponible y degradar limpiamente las tarjetas de hardware/backups cuando no vengan en la respuesta).

## 2. Verificación Planificada

- Backend: `npm run check`, `npm run check:sdk`, `node scripts/lint-budget.cjs --only backend`, Vitest unitarios + Fastify integrados (`audit.test.ts`, `health.test.ts`, `backup-restore.test.ts`, más nuevos tests para RBAC, redacción, `logs?limit=abc`, transiciones seeding, `restoreDatabase` 400/404).
- Frontend: `npm run check`, `node scripts/lint-budget.cjs --only frontend`, Vitest (`Governance` / `AuditLogs` / `SecurityInsights` / `SystemMaintenance`).
- Staging: rebuild de `portal-control-staging` y auditoría E2E Playwright + curl por `ga-verifier`.
