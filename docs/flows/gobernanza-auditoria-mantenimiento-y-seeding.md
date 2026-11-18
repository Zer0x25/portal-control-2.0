# Flujo: Gobernanza, Auditoría, Mantenimiento y Seeding (`gobernanza-auditoria-mantenimiento-y-seeding`)

**Estado:** `SINCRONIZADO_Y_VERIFICADO`
**Última actualización:** 2026-11-18
**Spec de cierre:** [Spec 120](../../specs/120-corregir-gobernanza-auditoria-mantenimiento/spec.md)
**Módulos backend:** `audit`, `admin`, `maintenance`, `HealthService`, `AdminService`, `auditService`, `securityAuditService`, `integrityMaintenanceService`, `backupService`, `backupHealthService`, `maintenanceService`, `seedingJobService`, `runtimeJobs`, `schedulerService`
**Módulos frontend:** `governance` (`GovernanceHub`, `IntegritySummaryView`, `SecurityInsights`, `AuditLogsView`, `SystemMaintenance`, `BackupListModal`, `HealthStatusView`), `configuration` (`DeveloperPanel`, `SeedingOptionsModal`, `SeedingProgressModal`), `HealthDashboard`, `sidebarMenu`, `App.tsx`

---

## 1. Alcance e Inventario AS-IS

### 1.1 Rutas y Permisos Frontend

- **Router:** `HashRouter` (`frontend/src/contexts/AppProviders.tsx:17`).
- **Ruta principal:** `#/admin/governance` (`ROUTES.GOVERNANCE_HUB = "/admin/governance"`, `frontend/src/App.tsx:442-451`).
  - Protegida por `<ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED, ROLES.AUDITOR]}>`.
  - Sincroniza la pestaña activa con `?tab=` (`useGovernanceData.ts`, `VALID_TABS = ["integrity", "security", "audit", "system", "health"]`, default `"integrity"`):
    1. `integrity` -> `IntegritySummaryView` + `IntegrityAnomalyTable`
    2. `security` -> `SecurityInsights`
    3. `audit` -> `AuditLogsView` (`AuditLogFilterPanel`, `AuditLogDetailDrawer`, `ExportLogsModal`, `AuditMonthSelector`)
    4. `system` -> `SystemMaintenance` (`HealthDashboard`, `BackupListModal`)
    5. `health` -> `HealthStatusView`
- **Redirecciones legacy (`frontend/src/App.tsx:225-246`):**
  - `#/audit-logs` -> `<Navigate to="/admin/governance?tab=audit" replace />`
  - `#/admin/tools` -> `<Navigate to="/admin/governance?tab=system" replace />`
  - `#/admin/integrity` -> `<Navigate to="/admin/governance?tab=integrity" replace />`
  - Todas envueltas en `<ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED, ROLES.AUDITOR]}>`.
- **Sidebar (`frontend/src/hooks/layout/sidebarMenu.ts:35-132`):**
  - `Fiscalizador` (`ROLES.AUDITOR`): `{ to: ROUTES.AUDIT_LOGS, label: "Auditoría" }`.
  - `Administrador` y `Supervisor_Elevado`: `{ to: ROUTES.GOVERNANCE_HUB, label: "Gobernanza" }`.
  - `Usuario`, `Reloj_Control` y `Supervisor`: sin enlace de Gobernanza/Auditoría.
- **Developer / Seeding Panel (`frontend/src/hooks/layout/usePersistentLayoutController.ts:87`, `PersistentLayout.view.tsx:102-108`):**
  - Solo visible cuando `currentUser?.role === "Administrador" && devModeEnabled` (`localStorage.getItem("devModeEnabled")`).

### 1.2 Endpoints Backend

#### A. Health (`backend/src/platform/fastify/app.ts:252-267`)

| Método y Ruta           | Auth / Rate Limit | Función AS-IS                                                                                                                              |
| :---------------------- | :---------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`       | Público / Exento  | Ejecuta `HealthService.getDetailedHealth()`. Retorna `200` si `database.status === "OK"` o `503` si falla. Expone info de host/BD/backups. |
| `GET /api/health/ready` | Público / Exento  | Ejecuta `HealthService.checkDbReady()` (`SELECT 1`); `503` (`NOT_READY`) si falla, o `{ status: "ready", healthStatus, instanceId }`.      |

#### B. Audit Logs (`/api/audit-logs*`, `backend/src/modules/audit/http/routes.ts:13-78`)

| Método y Ruta                          | Auth / Roles                                                     | Validación              | Función AS-IS                                                                 |
| :------------------------------------- | :--------------------------------------------------------------- | :---------------------- | :---------------------------------------------------------------------------- |
| `GET /api/audit-logs`                  | `viewer` (`Administrador`, `Supervisor_Elevado`, `Fiscalizador`) | `AuditLogQuerySchema`   | Lista paginada con filtros (`startDate`, `endDate`, `actor`, `action`, etc.). |
| `POST /api/audit-logs`                 | `session` (cualquier autenticado)                                | `AuditLogSchema`        | Crea registro en `audit_logs` (`201`).                                        |
| `POST /api/audit-logs/cleanup`         | `elevated` (`Administrador`, `Supervisor_Elevado`)               | `AuditLogCleanupSchema` | Elimina logs antiguos según `months` (`1..120`, default `6`).                 |
| `GET /api/audit-logs/integrity-status` | `viewer`                                                         | `z.unknown()`           | Retorna estado de cadena criptográfica de `TimeRecord` y sello digital.       |
| `GET /api/audit-logs/verify-integrity` | `elevated` (`Administrador`, `Supervisor_Elevado`)               | `z.unknown()`           | Ejecuta verificación profunda de integridad (`verifyFullChainIntegrity`).     |
| `GET /api/audit-logs/export`           | `viewer`                                                         | `z.unknown()`           | Exporta logs en streaming CSV/XML (`streamAuditExport`) o JSON (máx. 10.000). |

#### C. Admin (`/api/admin/*`, `backend/src/modules/admin/http/routes.ts:12-69`)

Todos los endpoints exigen `authenticate` + `admin` (`req.user?.role === "Administrador"`), están sujetos a `adminLimit` (`1000 req / 15 min`), exentos de `MAINTENANCE_MODE` en hook y devuelven `409 CONFLICT` en `enterWork` si hay mantenimiento activo:

| Método y Ruta                                  | Validación                | Función AS-IS                                                           |
| :--------------------------------------------- | :------------------------ | :---------------------------------------------------------------------- |
| `GET /api/admin/stats`                         | `z.unknown()`             | Estadísticas operativas y de usuarios/turnos/asistencia.                |
| `GET /api/admin/diagnose-autoclose`            | `z.unknown()`             | Diagnóstico de registros abiertos candidatos a autocierre.              |
| `GET /api/admin/security-insights`             | `z.unknown()`             | Resumen de alertas de seguridad recientes y estadísticas.               |
| `GET /api/admin/integrity-status`              | `z.unknown()`             | Estado de integridad criptográfica (alias admin).                       |
| `GET /api/admin/backups`                       | `z.unknown()`             | Lista archivos de respaldo disponibles vía `backupHealthService`.       |
| `POST /api/admin/trigger-autoclose`            | `z.unknown()`             | Ejecuta autocierre de marcaciones abiertas.                             |
| `POST /api/admin/trigger-accounting-autoclose` | `z.unknown()`             | Ejecuta cierre contable automático.                                     |
| `POST /api/admin/trigger-backup`               | `z.unknown()`             | Genera respaldo PostgreSQL vía `backupService.backupDatabase()`.        |
| `POST /api/admin/restart`                      | `z.unknown()`             | Solicita reinicio controlado del backend (`runtimeControlService`).     |
| `POST /api/admin/purge-sessions`               | `PurgeSessionsBodySchema` | Invalida sesiones activas de un usuario.                                |
| `POST /api/admin/reset-password`               | `ResetPasswordBodySchema` | Restablece contraseña de un usuario (min 6 caracteres).                 |
| `POST /api/admin/restore`                      | `RestoreBackupSchema`     | Restaura un respaldo `.sql` / `.sql.gz` desde el directorio de backups. |

#### D. Maintenance (`/api/maintenance/*`, `backend/src/modules/maintenance/http/routes.ts:14-69`)

Todos exigen `authenticate` + `admin` (`Administrador`), desactivan compresión (`compress: false`), están exentos de `globalRateLimit` y no tienen rate limit dedicado:

| Método y Ruta                              | Validación              | Función AS-IS                                                                  |
| :----------------------------------------- | :---------------------- | :----------------------------------------------------------------------------- |
| `DELETE /api/maintenance/clear-database`   | `z.unknown()`           | Limpia BD con `withDirectTransaction` preservando actor y `admin` (streaming). |
| `POST /api/maintenance/seed`               | `SeedOptionsSchema`     | Alias seeding Fase 1 (streaming progreso NDJSON).                              |
| `POST /api/maintenance/seed/phase1`        | `SeedOptionsSchema`     | Ejecuta seeding estructural Fase 1 (streaming progreso NDJSON).                |
| `POST /api/maintenance/seed/phase2/start`  | `SeedPhase2StartSchema` | Inicia job asíncrono `MARKINGS_PHASE2` en `seedingJobService`.                 |
| `POST /api/maintenance/seed/phase2/pause`  | `SeedPhase2JobSchema`   | Pausa job Fase 2.                                                              |
| `POST /api/maintenance/seed/phase2/resume` | `SeedPhase2JobSchema`   | Reanuda job Fase 2.                                                            |
| `POST /api/maintenance/seed/phase2/stop`   | `SeedPhase2JobSchema`   | Detiene job Fase 2.                                                            |
| `GET /api/maintenance/seed/phase2/status`  | `z.unknown()`           | Consulta estado de job Fase 2 (`jobId`).                                       |
| `GET /api/maintenance/seed/phase2/logs`    | `z.unknown()`           | Consulta logs paginados (`jobId`, `limit`) de job Fase 2.                      |

### 1.3 Jobs y Servicios de Fondo

- **`runDailyMaintenance` (`backend/src/services/runtimeJobs.ts:129-171`):** Programado a `BACKUP_SCHEDULE_HOUR`:`BACKUP_SCHEDULE_MINUTE` (default `02:00` local) con lock `portal_runtime.locks`. Si `BACKUP_ENABLED === "true"`, ejecuta `backupDatabase()` (hasta 3 reintentos) y luego `rotateAuditLogs()`.
- **`runMaintenance` (`backend/src/services/schedulerService.ts:58-94`):** Corre al iniciar el scheduler y a medianoche local bajo lock `scheduler:daily-maintenance`; difiere si hay mantenimiento o `seedingJob` Fase 2 activo; ejecuta `ensureInstanceId()`, `rotateAuditLogs()`, `refreshMaterializedViews()`, `runNightlyIntegrityMaintenance()`, `auditClosureHealth()` y `holidayService.getHolidays()`.
- **`backupService` (`backend/src/services/backupService.ts`):** Usa `spawn` / `execFileAsync` (sin `child_process.exec`), soporta `host`/`docker`/`auto`, retención GFS o legacy, y restaura con `psql --single-transaction --set=ON_ERROR_STOP=on`.
- **`seedingJobService` (`backend/src/services/seedingJobService.ts`):** Jobs `MARKINGS_PHASE2` persistidos con `workCoordinator.exclusive`, procesamiento paralelo por días, `skipTrigger: true`, post-proceso de correcciones y `backfillTimeRecordIntegrity`, con reanudación al arranque (`resumePendingOnStartup`).

---

## 2. Hallazgos Preliminares (Pendientes de Reproducción en Fase 2)

### Críticos / Seguridad y RBAC

1. **Desincronización RBAC Frontend vs Backend (`403` en runtime):** `App.tsx:225-246,442-451` y `GovernanceHub.view.tsx:28-38,62-88` permiten a `Supervisor_Elevado` y `Fiscalizador` entrar a `#/admin/governance` y muestran las 5 pestañas sin filtrar, pero `/api/admin/*` y `/api/maintenance/*` solo permiten `Administrador` (generando `403` en pestañas `Seguridad` y `Mantenimiento`, y en `#/admin/tools`). Además, `IntegritySummaryView.tsx:78-86` habilita **"Ejecutar Auditoría Profunda"** (`GET /api/audit-logs/verify-integrity`) para `Fiscalizador`, aunque el backend exige `elevated`.
2. **Fallo silencioso y pantalla en blanco en `SecurityInsights`:** `useSecurityInsightsController.ts:17-19` solo hace `logger.error` en el `catch`, dejando `stats = null` y `SecurityInsights.view.tsx:48` retornando `null` (pestaña en blanco ante 403 o error).
3. **`POST /api/audit-logs` abierto a cualquier rol autenticado:** `backend/src/modules/audit/http/routes.ts:41-48` usa `...session` sin restricción de rol, permitiendo a `Usuario` o `Kiosko` inyectar registros en `audit_logs`.
4. **Exposición de credenciales de BD en CLI de backups:** `backupService.ts:182,191,281,290,296` pasa la URL de conexión (`DIRECT_URL || DATABASE_URL` con password) en argumentos de `pg_dump`/`psql`, visible en `/proc/<pid>/cmdline` / `ps`.
5. **Leak de información en `GET /api/health` y `POST /api/admin/trigger-backup`:** `GET /api/health` público (`app.ts:252-259`, `HealthService.ts:82-143`) expone versión de Node, plataforma/arquitectura, CPUs/memoria/loadAvg, tamaño de BD y errores/conteo de backups; `trigger-backup` devuelve `finalPath` absoluto del servidor al cliente.
6. **Pérdida de detalles de `UNHANDLED_ERROR` y falta de redacción en `getSecurityInsights`:** `auditService.ts:60` redacta antes de guardar (`redaction.ts:39-45` sobrescribe `message`/`stack`/`query`/`body` en `UNHANDLED_ERROR`), mientras `AdminService.ts:61-67,79` lee `recentAlerts` sin pasar por `redactAuditFields`.

### Bugs Funcionales y Contratos

7. **Filtro `Acción` roto en Auditoría:** `useAuditLogsController.ts:51-58` omite `action: debouncedFilters.action` al armar `queryParams.filters`, aunque el panel (`AuditLogFilterPanel.tsx:250-295`), hook y backend sí lo soportan.
8. **Toast genérico en `verifyIntegrity`:** `useAuditLogMutations.ts:13` lee `data.message` en lugar de `data.data?.message`.
9. **Validación ausente / `NaN` en `GET /api/maintenance/seed/phase2/logs` y transiciones de `seedingJobService`:** `limit` no numérico produce `take: NaN` en Prisma (`seedingJobService.ts:210-215`); `pause`/`resume`/`stop` (`seedingJobService.ts:168-199`) no validan existencia ni estado previo del job.
10. **Error 500 en `backupService.restoreDatabase` por path/archivo inválido:** `backupService.ts:203-212` lanza `new Error(...)` genérico en lugar de `ValidationError` / `NotFoundError`.
11. **Drift de esquemas y `z.unknown()`:** `AuditLogSchema` exige `id`/`timestamp`/`actorUsername` ignorados en `POST /api/audit-logs`; `HealthStatusSchema` no coincide con `GET /api/health`; múltiples rutas usan `validateRequest(..., z.unknown())`.

### Zonas Horarias, Rendimiento, UI/A11y y Deuda Técnica

12. **Mezcla de hora local del host / UTC en lugar de `America/Santiago`:** `auditService.ts:250,346`, `auditExport.ts:45`, `AdminService.ts:6`, `schedulerService.ts:49`, `runtimeJobs.ts:204`, `seedingJobService.ts:293`.
13. **Event loop / N+1 / `$extends`:** FS síncrono (`readdirSync`/`statSync`) en `backupHealthService.ts` llamado por `/api/health`; `runAutoRechainIfNeeded()` (`integrityMaintenanceService.ts:132-145`) ejecuta `sealAfterMutation` registro a registro; `rotateAuditLogs()` (`maintenanceService.ts:55,62,74`) borra `ShiftReport`/`MeterReading` sin `skipTrigger: true`.
14. **`console.warn`/`console.error` en producción:** Presente en `maintenanceService.ts`, `HealthService.ts`, `securityAuditService.ts`, `db.ts`, `runtimeControlService.ts`.
15. **UI, Render y A11y en Frontend:** `AuditLogDesktopRow`/`AuditLogMobileRow` definidos dentro de `AuditLogsViewView` (remonta filas en cada render), falta de `EmptyState`, filas `<div>` sin `role="button"`/`tabIndex`/`onKeyDown`, `ExportLogsModal` sin `role="dialog"`/`Escape`, botón "Restaurar" invisible sin hover en `BackupListModal.view.tsx:101`, `window.confirm` nativo en `SystemMaintenance`, e `<input type="date">` nativo en `AuditLogFilterPanel`.

---

## 3. Resultados Reproducidos en Fase 2 (2026-11-18)

Reproducción ejecutada por `ga-api-repro` (staging + Fastify aislado sobre PostgreSQL 18.4, 30/30 baseline tests passing) y `ga-ui-repro` (Playwright headless sobre `http://127.0.0.1:8080`, usuarios temporales eliminados tras la prueba):

- **Confirmado — RBAC Frontend vs Backend (`403`):** `Supervisor_Elevado` y `Fiscalizador` acceden a `#/admin/governance` con todas las pestañas visibles, recibiendo `403` en `GET /api/admin/security-insights` (pestaña `Seguridad` queda en blanco, `textLen=175`) y `GET /api/admin/stats` (pestaña `Mantenimiento`), además de `403` para `Fiscalizador` al pulsar **"Ejecutar Auditoría Profunda"** (`GET /api/audit-logs/verify-integrity`).
- **Confirmado — Filtro `Acción` roto en UI:** escribir `"LOGIN"` en `"Filtrar por acción..."` en `#/admin/governance?tab=audit` no dispara ninguna petición `GET /api/audit-logs` (`useAuditLogsController.ts:51-58` omite `action`).
- **Confirmado — Toast genérico en `verifyIntegrity`:** el backend retorna `data.message: "Auditoría criptográfica completada..."` (`200`), pero la UI muestra `"Auditoría de integridad iniciada correctamente"` (`useAuditLogMutations.ts:13`).
- **Confirmado — UI/A11y en Auditoría y Sistema:** filas de auditoría sin `role`/`tabIndex` (`tabIndex: null`), `ExportLogsModal` sin `role="dialog"`/`Escape`, ausencia de `EmptyState` al filtrar sin resultados, botón `Restaurar` en `BackupListModal` con `opacity: 0` incluso al hacer `.focus()`, y `window.confirm` nativo al restaurar.
- **Confirmado — `GET /api/health` público + drift:** retorna `200` sin auth exponiendo `nodeVersion`, `platform`, `arch`, `cpus`, `memory`, `os.loadAvg`, `database.size` y `backup.lastError`; falla validación contra `HealthStatusSchema`.
- **Confirmado — `POST /api/audit-logs` y redacción:** roles `Usuario` y `Reloj_Control` obtienen `201`; `AuditLogSchema` exige `id`/`timestamp`/`actorUsername` ignorados por el servidor; `UNHANDLED_ERROR` guarda `details.message = "Error al procesar solicitud"` y `metadata.body/query = "[REDACTED]"` al redactar antes de persistir; `AdminService.getSecurityInsights()` devuelve `recentAlerts` sin redactar.
- **Confirmado — Backups y Seeding:** `POST /api/admin/trigger-backup` devuelve `data.backupPath` absoluto; `POST /api/admin/restore` con `../etc/passwd` o archivo inexistente responde `500 INTERNAL_ERROR`; `GET /api/maintenance/seed/phase2/logs?jobId=any-id&limit=abc` responde `500` por `take: NaN`; `POST /api/maintenance/seed/phase2/pause` sobre job `completed` responde `200`.

---

## 4. Cierre y Verificación (Spec 120, 2026-11-18)

- **Backend (`ed1b88b`):**
  - `GET /api/health` público minimizado (`status`, `instanceId`, `timestamp`, `database.status`, `responseTime`) y detalle completo exclusivo para sesión `Administrador`; `HealthStatusSchema` y SDK OpenAPI sincronizados.
  - `POST /api/audit-logs` restringido a `elevated` con `AuditLogSchema` actualizado (`id`, `timestamp`, `actorUsername` opcionales); `UNHANDLED_ERROR` preserva `details.message`; `AdminService.getSecurityInsights()` redacta `recentAlerts`.
  - `POST /api/admin/trigger-backup` omite `finalPath` absoluto; `backupService.ts` usa `PGPASSWORD` en entorno en lugar de credenciales en CLI; `restoreDatabase` devuelve `ValidationError` (`400`) y `NotFoundError` (`404`).
  - `GET /api/maintenance/seed/phase2/logs` valida `jobId` y `limit` con Zod; `seedingJobService` valida existencia y transiciones de estado (`404`/`409`).
  - Migración de `setHours` local a helpers `America/Santiago` en `timePolicy.ts` y reemplazo de `console.*` por `logger` estructurado.
- **Frontend (`12b39f6`):**
  - RBAC alineado: `#/admin/tools` exclusivo `Administrador`, `GovernanceHub` filtra pestañas por rol (`Supervisor_Elevado` y `Fiscalizador` acceden a `integrity`, `audit`, `health`), `IntegritySummaryView` oculta "Ejecutar Auditoría Profunda" a `Fiscalizador`, y `SecurityInsights` muestra estado de error con reintento.
  - Filtro `action` conectado en `useAuditLogsController.ts`; toast específico `data.data?.message` en `useAuditLogMutations.ts`.
  - `AuditLogDesktopRow`/`MobileRow` extraídos fuera del render con `EmptyState` y soporte de teclado (`role="button"`, `tabIndex={0}`, `Enter`/`Space`); `ExportLogsModal` con `role="dialog"` y `Escape`; `BackupListModal` con `group-focus-within:opacity-100`; `window.confirm` reemplazado por `ConfirmationModal`; `HealthStatusView` adaptado al payload mínimo público.
- **Verificación ejecutada:**
  - `npm run lint:budget`: `0` errors / `0` warnings en backend y frontend.
  - `cd backend && npm run check && npm run check:sdk` y `cd frontend && npm run check`: PASS.
  - Vitest frontend (`src/tests/features/governance/`): 6/6 archivos, 25/25 tests PASS.
  - Vitest backend (`spec120GovernanceFixes.test.ts`, `auditRedaction.test.ts`, `api-contract.test.ts`, `swagger.snapshot.generated.test.ts`): 4/4 archivos, 12/12 tests PASS.
  - Staging (`http://127.0.0.1:8080`, `compose.staging.yaml`): verificación API (`curl`) y Playwright (`ga-verifier`) PASS con `0` errores HTTP >=400, `0` `console.error` y `0` `pageerror`.
