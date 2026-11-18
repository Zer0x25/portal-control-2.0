# Spec 120: Corrección Integral de Gobernanza, Auditoría, Mantenimiento y Seeding

**Estado:** `APROBADA`
**Fecha:** 2026-11-18
**Flujo:** [`gobernanza-auditoria-mantenimiento-y-seeding`](../../docs/flows/gobernanza-auditoria-mantenimiento-y-seeding.md)
**Decisiones del usuario:** `1.A`, `2.A`, `3.A`

---

## 1. Objetivo

Corregir las desincronizaciones de RBAC, brechas de seguridad/exposición de datos, bugs funcionales, errores de manejo de zonas horarias y deficiencias de UI/accesibilidad reproducidas en Fase 2 sobre `#/admin/governance`, `/api/health`, `/api/audit-logs*`, `/api/admin/*` y `/api/maintenance/*`.

---

## 2. Requisitos Funcionales y de Seguridad

### RF-1: Alineación RBAC Frontend ↔ Backend (Decisión `1.A`)

- En `GovernanceHub`:
  - `Administrador`: accede a las 5 pestañas (`integrity`, `security`, `audit`, `system`, `health`).
  - `Supervisor_Elevado` y `Fiscalizador`: solo ven y acceden a `integrity`, `audit` y `health` (si la URL tiene `?tab=security` o `?tab=system`, redirige/normaliza a una pestaña permitida como `integrity`).
  - `IntegritySummaryView`: oculta el botón **"Ejecutar Auditoría Profunda"** (`verify-integrity`) para `Fiscalizador` (solo visible para `Administrador` y `Supervisor_Elevado`).
  - `#/admin/tools` en `App.tsx` pasa a exigir `requiredRoles={[ROLES.ADMIN]}`.
  - `SecurityInsights`: ante error de red o `403`, renderiza un estado de error visible (no pantalla en blanco ni `return null`).

### RF-2: Hardening de `/api/health`, `/api/admin/trigger-backup` y `POST /api/audit-logs` (Decisión `2.A`)

- `GET /api/health` (público): retorna únicamente estado sanitario mínimo (`status`, `database.status`, `responseTime`, `timestamp`, `instanceId`), sin exponer `nodeVersion`, `platform`, `arch`, `cpus`, `memory`, `os.loadAvg`, `database.size` ni detalles/errores internos de backups.
  - Si se solicita vista detallada (o mediante endpoint autenticado para `Administrador`, p. ej. `GET /api/admin/health` o `GET /api/health?detail=1` con token `Administrador` válido — **nota**: `HealthStatusView` en UI es visible para `Supervisor_Elevado` y `Fiscalizador`, por lo que `HealthStatusView` debe tolerar/adaptarse al payload mínimo público cuando no es `Administrador` o usar la info pública sin romper la vista!).
  - Actualizar `HealthStatusSchema` para que coincida exactamente con la respuesta real de `GET /api/health` y regenerar OpenAPI/SDK si cambia el contrato.
- `POST /api/admin/trigger-backup`: omite `finalPath` absoluto del filesystem en la respuesta HTTP (retorna `filename`, `sizeBytes`, `durationMs`, etc.).
- `POST /api/audit-logs`: restringir el endpoint a roles autorizados (`elevated`: `["Administrador", "Supervisor_Elevado"]`) y ajustar `AuditLogSchema` para no exigir `id`, `timestamp` ni `actorUsername` (generados por el servidor).

### RF-3: Correcciones Backend de Auditoría, Backups, Seeding, Zonas Horarias y Logging (Decisión `3.A`)

- **Auditoría y Redacción:**
  - En `auditService.logError` / `auditService.log` / `redaction.ts`: preservar `details.message` en eventos `UNHANDLED_ERROR` (redactando secretos/PII en `metadata`/`details`, sin sobrescribir el mensaje real con `"Error al procesar solicitud"` al persistir).
  - En `AdminService.getSecurityInsights()`: aplicar `redactAuditFields` a `recentAlerts` antes de retornarlos.
- **Backups y CLI:**
  - En `backupService.ts`: pasar credenciales de `pg_dump` / `psql` mediante variable de entorno `PGPASSWORD` (parseando la URL con `new URL(...)`) y argumentos seguros sin contraseña en línea de comandos (`ps` / `/proc/<pid>/cmdline`).
  - En `backupService.restoreDatabase()`: validar nombre de archivo (`backup-pg-...`) y existencia lanzando `ValidationError` (`400`) y `NotFoundError` (`404`) en lugar de `Error` genérico (`500`).
- **Seeding:**
  - En `GET /api/maintenance/seed/phase2/logs`: validar `jobId` y `limit` con Zod (`z.coerce.number().int().min(1).max(1000).default(100)`) para evitar `take: NaN` (`500`).
  - En `seedingJobService.ts`: validar existencia del job (`NotFoundError` `404`) y transiciones de estado válidas en `pause` (solo `running`/`pending`), `resume` (solo `paused`) y `stop` (solo `pending`/`running`/`paused`), devolviendo `ValidationError`/`ConflictError` (`400`/`409`) en transiciones inválidas.
- **Zonas Horarias (`America/Santiago`):**
  - Reemplazar `setHours` local en `auditService.ts`, `auditExport.ts`, `AdminService.ts`, `schedulerService.ts`, `runtimeJobs.ts` y `seedingJobService.ts` por helpers consistentes en `America/Santiago` (`timePolicy.ts`).
- **Logging:**
  - Reemplazar `console.warn`/`console.error` en `maintenanceService.ts`, `HealthService.ts`, `securityAuditService.ts`, `db.ts` y `runtimeControlService.ts` por `logger` estructurado.

### RF-4: Correcciones Frontend de Auditoría, Integridad, Mantenimiento y Accesibilidad (Decisión `3.A`)

- `useAuditLogsController.ts`: incluir `action: debouncedFilters.action` en `queryParams.filters` para que el filtro `"Filtrar por acción..."` funcione contra el backend.
- `useAuditLogMutations.ts`: leer `data.data?.message` al mostrar el toast de `verifyIntegrity`.
- `AuditLogsView.view.tsx`:
  - Mover `AuditLogDesktopRow` y `AuditLogMobileRow` fuera del cuerpo de `AuditLogsViewView` para evitar desmontaje/remontaje en cada re-render.
  - Renderizar `EmptyState` cuando `!isLoading && allLogs.length === 0`.
  - Hacer las filas operables por teclado (`role="button"`, `tabIndex={0}`, `onKeyDown` con `Enter`/`Space`).
- `ExportLogsModal.tsx`: agregar `role="dialog"`, `aria-modal="true"` y cierre con tecla `Escape`.
- `BackupListModal.view.tsx`: añadir `group-focus-within:opacity-100` (y visibilidad en touch/focus) al botón **"Restaurar"**.
- `SystemMaintenance`: reemplazar `window.confirm(...)` por `ConfirmationModal` del design system.
- `HealthStatusView.tsx`: adaptar tarjetas de telemetría para soportar el payload mínimo público sin errores cuando el usuario no es `Administrador` (y mostrar detalle extendido cuando esté disponible).
