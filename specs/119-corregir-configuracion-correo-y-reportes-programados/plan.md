# Plan 119: Implementación Backend y Frontend

## Fase Backend (`ec-backend-fix`)

1. **Configs (`backend/src/modules/configs/...`, `backend/src/services/ConfigService.ts`)**:
   - Bloquear escritura de `PROTECTED_KEYS` (`SMTP_CONFIG`, `EMAIL_NOTIFICATION_RULES`) en `POST /api/configs/:key` (`400 Bad Request` / error de dominio indicando usar `/api/email/config` y `/api/email/rules`).
   - En `GET /api/configs/validate-closure`, validar query `{ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }`.
2. **Email & SSRF & HTML (`backend/src/services/EmailService.ts`, `backend/src/models/schemas/smtpProfile.schemas.ts`)**:
   - Agregar helper `assertSafeSmtpHost(host)` (bloquea localhost, loopback `127.x`/`::1`, link-local `169.254.x`/`fe80::`, `0.0.0.0`, RFC1918 `10.x`/`172.16-31.x`/`192.168.x`, ULA `fc00::/7`, salvo `process.env.SMTP_ALLOW_PRIVATE_HOSTS === "true"`).
   - Mover `getSmtpConfig()` dentro de `try/catch` en `sendEmail` y `sendEmailWithAttachment`.
   - Agregar helper `escapeHtml(str)` y aplicarlo en `sendEmail` (`message`).
3. **Scheduler & ScheduledReports (`backend/src/services/schedulerService.ts`, `backend/src/services/ScheduledReportService.ts`)**:
   - `ScheduledReportService.normalize`: `.filter(Boolean)` en `recipients`.
   - `schedulerService.ts`: escapar HTML en `report.name` y `report.description`; completar `getReportTypeName` (`calendar`, `detailed`, `shift_report`); en `executeReportWork` iterar todos los destinatarios capturando errores por destinatario para no abortar el resto (marcando `delivered = true` si al menos uno tuvo éxito y loggeando fallos parciales); reemplazar `console.warn`/`console.error` en `startMaintenanceJobs` por `logger` y usar `LockService.withLock`.
4. **Import Preview (`backend/src/modules/importExport/http/routes.ts`, `backend/src/modules/importExport/application/flows.ts`, `backend/src/services/importExportFlows.ts`, `backend/src/services/importWorkbook.ts`)**:
   - Rechazar múltiples campos `schema` (`400`).
   - Limitar filas máximas en `importWorkbook` / `previewImport` (`MAX_IMPORT_PREVIEW_ROWS = 5000`, lanzando error `400` controlado).
   - Aplicar validación `required` y coerción de `type` (`Number`, `Boolean`, `Date`, `String`) en `importExportFlows` / `flows.ts`.
5. **OpenAPI & SDK**:
   - Si algún schema de ruta cambia (`validate-closure` query), regenerar `swagger.json` y `frontend/src/types/api-schema.ts`.
6. **Tests**:
   - Ampliar unit tests (`emailService`, `schedulerService`, `importExportFlows`, `configService`) y Fastify integration tests (`dataConfigs.test.ts`, `emailReports.test.ts`, `importExport.test.ts`) en PostgreSQL 18.4.

## Fase Frontend (`ec-frontend-fix`)

1. **Sidebar (`frontend/src/hooks/layout/sidebarMenu.ts`)**:
   - Restringir `ROUTES.CONFIGURATION` en el sidebar a `[ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED]`.
2. **GlobalVariables (`useConfigQuery.ts`, `useGlobalVariablesController.ts`, `GlobalVariablesManager.view.tsx`)**:
   - Quitar fallback `["info@test.lan"]` -> retornar `[]`.
   - `try/catch` en `handleAddArea`, `handleAddWorkdayType`, `handleAddEmailRecipient`.
   - `useEffect` para sincronizar `logoWidthInput` y `logoHeightInput` cuando cargue `brandLogo`.
   - Corregir `"NUEVO PROTOCOLO/TIPO"` y agregar `aria-label` al `<Switch>` de Control Interno.
3. **EmailCenter & SmtpConfigModal (`emailService.ts`, `useEmailCenterController.ts`, `EmailCenter.view.tsx`, `useSmtpConfigController.ts`, `SmtpConfigModal.view.tsx`)**:
   - `emailService.getRules`: no devolver todo `false` en error; exponer fallo y deshabilitar guardado de reglas si no cargaron (`rulesLoadError`).
   - `useEmailCenterController`: validar con `emailRulesFormSchema` antes de guardar y exponer `isSavingRules`.
   - `EmailCenter.view.tsx`: `disabled={isSavingRules || rulesLoadError}` en botón guardar reglas; quitar `uppercase` del input `Para:`; agregar `id` + `aria-label` a checkboxes de `RuleEditor`.
   - `useSmtpConfigController.ts` y `SmtpConfigModal.view.tsx`: validar `activeProfileIndex` (que el perfil activo esté configurado/válido) y cualquier perfil parcialmente rellenado; proteger `profiles[currentSlot]`; agregar `role="dialog"`, `aria-modal="true"`, cierre con `Escape` y `aria-label="Cerrar"`.
4. **MasterDataExport (`MasterDataExport.view.tsx`)**:
   - Asociar `htmlFor`/`id` a los pickers de fecha y quitar el texto hardcodeado `"Server: Online"` (reemplazarlo por badge informativo neutral o estado real).
5. **Reportes Programados (`frontend/src/services/scheduledReportService.ts`, `frontend/src/features/configuration/...`)**:
   - Crear `scheduledReportService.ts` usando `apiClient` y tipos de `api-schema.ts`.
   - Crear tab `"scheduled-reports"` ("Reportes Programados") en `Configuration.view.tsx` (`ScheduledReports.container.tsx`, `ScheduledReports.view.tsx`, `useScheduledReportsController.ts`) con tabla, modal/formulario de creación y edición, toggle activo/inactivo y eliminación con `ConfirmationModal`.
6. **Tests**:
   - Tests unitarios Vitest para `sidebarMenu`, `emailService`, `scheduledReportService`, `useSmtpConfigController`, `useEmailCenterController`, `useGlobalVariablesController`, `ScheduledReports`.
