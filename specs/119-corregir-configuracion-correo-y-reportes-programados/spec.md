# Spec 119: Corregir Configuración, Correo, Importación y Reportes Programados

**Flujo:** `configuracion-correo-y-reportes-programados`
**Estado:** `COMPLETADO`
**Fecha:** 2026-11-18

---

## 1. Contexto y Decisiones del Usuario

Derivado de Fase 2 (`docs/flows/configuracion-correo-y-reportes-programados.md`) y decisiones aprobadas:

1. **Reportes programados (`/api/scheduled-reports*`)**: implementar servicio, hook y UI CRUD + toggle dentro de `#/configuration` (sección/subpestaña en Centro de Correos o pestaña `scheduled-reports`) y corregir los bugs del scheduler (`schedulerService`, `ScheduledReportService`, escapado HTML).
2. **Seguridad y permisos de configuración/correo**: bloquear `SMTP_CONFIG` y `EMAIL_NOTIFICATION_RULES` en `POST /api/configs/:key` (forzar uso de `/api/email/config` y `/api/email/rules`), mantener acceso de `Administrador` + `Supervisor_Elevado` en `/api/email/*`, y ocultar `Config` en `sidebarMenu.ts` para `Supervisor` y `Reloj_Control`.
3. **Importación (`/api/import/preview`) y SSRF SMTP**: limitar filas en `POST /api/import/preview` + validar `type`/`required`/único `schema`, y bloquear hosts loopback/link-local/privados en SMTP salvo override explícito `SMTP_ALLOW_PRIVATE_HOSTS=true`.

---

## 2. Requisitos Funcionales y de Seguridad

### RF-01: Blindaje de `POST /api/configs/:key` y `validate-closure`

- `POST /api/configs/:key` debe rechazar (HTTP `400` o `403`, p. ej. `403` o `400` explícito con mensaje claro) cualquier escritura directa sobre claves protegidas (`SMTP_CONFIG`, `EMAIL_NOTIFICATION_RULES`), indicando usar `/api/email/config` y `/api/email/rules`.
- `GET /api/configs/validate-closure` debe validar `query` con schema Zod (`{ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }`) usando `validateRequest("query", ...)`.

### RF-02: Protección SSRF, Cifrado Resiliente y Escapado HTML en `EmailService`

- Validar `host` en `SmtpVerifySchema` y `MultiSmtpConfigSchema` (o en `EmailService` al verificar/guardar) bloqueando direcciones loopback (`127.0.0.0/8`, `::1`, `localhost`), link-local/metadata (`169.254.0.0/16`, `fe80::/10`), `0.0.0.0`, y rangos privados RFC1918/ULA (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`) **a menos que** `process.env.SMTP_ALLOW_PRIVATE_HOSTS === "true"`.
- Mover `await this.getSmtpConfig()` **dentro** del bloque `try/catch` en `sendEmail` y `sendEmailWithAttachment` (y manejar fallo de `decrypt()` limpiamente devolviendo `{ success: false, message }` sin lanzar `500` ni rechazo no capturado).
- Escapar caracteres HTML (`&`, `<`, `>`, `"`, `'`) en `message` dentro de `EmailService.sendEmail` antes de convertir `\n` a `<br>`, y en `report.name` / `report.description` dentro de `schedulerService.ts`.

### RF-03: Correcciones en `schedulerService` y `ScheduledReportService`

- `ScheduledReportService.normalize`: filtrar entradas vacías en `recipients` (`split(",").map(...).filter(Boolean)`).
- `schedulerService.getReportTypeName`: mapear todos los tipos permitidos en `ScheduledReportInputSchema` (`daily`, `weekly`, `monthly`, `calendar`, `detailed`, `shift_report`).
- `schedulerService.executeReportWork`: enviar a todos los destinatarios de forma independiente (`Promise.allSettled` o `try/catch` por destinatario) para no abortar el envío a los siguientes si uno falla; registrar fallo parcial o total con `logger.warn`/`logger.error` sin `console.warn`/`console.error`.
- `startMaintenanceJobs`: envolver en `LockService.withLock` si hay múltiples instancias y reemplazar `console.warn`/`console.error` por `logger`.

### RF-04: Límites y Validación en `POST /api/import/preview`

- Rechazar múltiples campos `schema` en multipart (`400` explícito en lugar de concatenar con `,`).
- Aplicar tope máximo de filas (ej. `MAX_IMPORT_PREVIEW_ROWS = 5000`, devolviendo `400` o truncado explícito — usar `400` con mensaje claro si excede el máximo soportado o cap explícito documentado; validar coherencia con tests).
- En `parseMapping` / `importExportFlows`: respetar `required: true` (registrar error/fila inválida o rechazar) y coerción básica para `type` (`Number`, `Boolean`, `Date`, `String`).

### RF-05: Frontend — Permisos Sidebar y Reportes Programados

- `frontend/src/hooks/layout/sidebarMenu.ts`: mostrar `Config` únicamente a `[ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED]`, coincidiendo con `ProtectedRoute`.
- Implementar `scheduledReportService.ts` + hooks React Query + sección/tab de **Reportes Programados** en `#/configuration` (p. ej. tab `scheduled-reports` o sección en `#/configuration?tab=email` — recomendable tab `scheduled-reports` "Reportes Programados" en `Configuration.view.tsx` para mantener cada tab limpio y enfocado) con:
  - Listado (`GET /api/scheduled-reports`) mostrando nombre, tipo, frecuencia/cron, destinatarios, estado activo/inactivo, última/próxima ejecución.
  - Crear / Editar (`POST` / `PUT /api/scheduled-reports`), Toggle activo/inactivo (`PATCH /api/scheduled-reports/:id/toggle`), Eliminar (`DELETE /api/scheduled-reports/:id`) con `ConfirmationModal`.

### RF-06: Frontend — Bugs de `GlobalVariablesManager`, `EmailCenter`, `SmtpConfigModal` y `MasterDataExport`

- `useConfigQuery.ts`: quitar fallback ficticio `["info@test.lan"]` cuando `email_recipients` es `null` (retornar `[]`).
- `useGlobalVariablesController.ts`: manejar errores en `handleAddArea`, `handleAddWorkdayType`, `handleAddEmailRecipient` (`try/catch` para evitar unhandled rejection cuando `mutateAsync` falla y preservar input en error); sincronizar `logoWidthInput`/`logoHeightInput` con `brandLogo` al cargar.
- `GlobalVariablesManager.view.tsx`: corregir typo `"NUEVO PROTOCOLO/TIPO"` y agregar `aria-label` al `<Switch>` de Control Interno.
- `useSmtpConfigController.ts` y `SmtpConfigModal.view.tsx`:
  - Permitir activar/guardar el perfil sin exigir que los otros slots inactivos estén llenos, pero **validar con schema** cualquier slot que tenga datos parciales o el slot activo antes de enviar `POST /api/email/config`; proteger `profiles[currentSlot]` contra `undefined`.
  - Accesibilidad del modal: `role="dialog"`, `aria-modal="true"`, cierre con tecla `Escape` y `aria-label="Cerrar"` en el botón de cierre.
- `useEmailCenterController.ts`, `EmailCenter.view.tsx` y `emailService.ts`:
  - Validar reglas con `emailRulesFormSchema` antes de `POST /api/email/rules`, agregar estado `isSavingRules` (`disabled`/loading en botón Guardar).
  - En `emailService.getRules`, no silenciar error de red/500 con todo `false`: propagar/marcar error para evitar sobrescritura accidental.
  - Quitar clase `uppercase` del input `Para:` de correo de prueba.
  - Agregar `id` + `aria-label` a los checkboxes de `RuleEditor`.
- `MasterDataExport.view.tsx`: asociar `<label htmlFor>`/`id` en pickers de fecha y reemplazar `"Server: Online"` estático por un badge claro basado en estado real o quitar el texto engañoso hardcodeado (o usar `useHealth` / texto descriptivo de disponibilidad local).

---

## 3. Criterios de aceptación

- [x] `npm run lint:budget` en `0/0`.
- [x] `npm run docs:check` OK.
- [x] `cd backend && npm run check && npm run check:sdk` OK.
- [x] Tests unitarios e integración Fastify (PostgreSQL 18.4) cubriendo RF-01..RF-04 sin regresiones.
- [x] Tests unitarios frontend cubriendo RF-05..RF-06 y verificación en `portal-control-staging` (`http://127.0.0.1:8080`).
