# Tasks 119: Configuración, Correo, Importación y Reportes Programados

- [ ] **BE-1**: Bloquear `PROTECTED_KEYS` en `POST /api/configs/:key` y validar `query.date` en `GET /api/configs/validate-closure` (`RF-01`).
- [ ] **BE-2**: Protección SSRF SMTP (`SMTP_ALLOW_PRIVATE_HOSTS`), `getSmtpConfig()` dentro de `try/catch`, y `escapeHtml` en `EmailService.sendEmail` (`RF-02`).
- [ ] **BE-3**: Corregir `ScheduledReportService.normalize`, `schedulerService` (`escapeHtml`, `getReportTypeName`, envío independiente por destinatario, `logger` + `LockService` en `startMaintenanceJobs`) (`RF-03`).
- [ ] **BE-4**: Corregir `POST /api/import/preview` (rechazar múltiples `schema`, tope de filas `5000`, validar `required` y coerción de `type`) (`RF-04`).
- [ ] **BE-5**: Tests unitarios e integración Fastify (PostgreSQL 18.4) + `npm run check` / `npm run check:sdk`.
- [ ] **FE-1**: Restringir ítem `Config` en `sidebarMenu.ts` a `Administrador` y `Supervisor_Elevado` (`RF-05`).
- [ ] **FE-2**: Corregir `useConfigQuery`, `useGlobalVariablesController` y `GlobalVariablesManager.view.tsx` (`RF-06`).
- [ ] **FE-3**: Corregir `emailService.getRules`, `useEmailCenterController`, `EmailCenter.view.tsx`, `useSmtpConfigController`, `SmtpConfigModal.view.tsx` y `MasterDataExport.view.tsx` (`RF-06`).
- [ ] **FE-4**: Implementar `scheduledReportService` + tab `scheduled-reports` en `#/configuration` con CRUD, toggle y eliminación (`RF-05`).
- [ ] **FE-5**: Tests unitarios Vitest + `npm run check` + `npm run lint`.
- [ ] **QA-1**: Sincronizar `swagger.json` / `api-schema.ts`, rebuild `portal-control-staging` y verificar en vivo (`http://127.0.0.1:8080`) + cerrar flujo en `docs/flows/`.
