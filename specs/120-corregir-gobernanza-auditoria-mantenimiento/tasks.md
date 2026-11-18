# Tasks — Spec 120

- [ ] **BE-1:** Hardening `GET /api/health` (mínimo público / detalle solo `Administrador`) y actualizar `HealthStatusSchema`.
- [ ] **BE-2:** Restringir `POST /api/audit-logs` a `elevated`, ajustar `AuditLogSchema`, preservar `details.message` en `UNHANDLED_ERROR`, y redactar `recentAlerts` en `AdminService.getSecurityInsights()`.
- [ ] **BE-3:** Ocultar `finalPath` en `POST /api/admin/trigger-backup`, pasar credenciales por `PGPASSWORD` en `backupService.ts` y devolver `400`/`404` (`ValidationError`/`NotFoundError`) en `restoreDatabase`.
- [ ] **BE-4:** Validar `limit`/`jobId` en `GET /api/maintenance/seed/phase2/logs` y transiciones de estado en `seedingJobService.ts`.
- [ ] **BE-5:** Migrar `setHours` local a `America/Santiago` (`timePolicy.ts`) y reemplazar `console.warn`/`console.error` por `logger` en servicios de gobernanza/mantenimiento.
- [ ] **BE-6:** Sincronizar OpenAPI/SDK (`npm run check:sdk`) y agregar tests unitarios y de integración Fastify.
- [ ] **FE-1:** Alinear RBAC en `App.tsx`, `GovernanceHub`, `useGovernanceData` e `IntegritySummaryView`, más estado de error en `SecurityInsights`.
- [ ] **FE-2:** Corregir filtro `action` en `useAuditLogsController.ts` y toast `data.data?.message` en `useAuditLogMutations.ts`.
- [ ] **FE-3:** Extraer `AuditLogDesktopRow`/`MobileRow` fuera del render, añadir `EmptyState`, a11y de teclado en filas, `role="dialog"`/`Escape` en `ExportLogsModal` y `group-focus-within:opacity-100` en `BackupListModal`.
- [ ] **FE-4:** Reemplazar `window.confirm` por `ConfirmationModal` en `SystemMaintenance` / `BackupListModal` y adaptar `HealthStatusView` al payload mínimo de `/api/health`.
- [ ] **FE-5:** Añadir pruebas Vitest frontend y validar `npm run check` y `lint:budget`.
- [ ] **QA-1:** Rebuild de `portal-control-staging` y verificación en vivo (`ga-verifier`) con `curl` y Playwright.
