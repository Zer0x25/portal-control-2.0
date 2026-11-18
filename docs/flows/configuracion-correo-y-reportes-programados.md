# Flujo: Configuración, Correo y Reportes Programados (`configuracion-correo-y-reportes-programados`)

**Estado:** `SINCRONIZADO_Y_VERIFICADO`
**Última actualización:** 2026-11-18
**Spec de cierre:** [Spec 119](../../specs/119-corregir-configuracion-correo-y-reportes-programados/spec.md)
**Módulos backend:** `configs`, `emailReports`, `importExport`, `schedulerService`, `runtimeJobs`
**Módulos frontend:** `configuration` (`GlobalVariablesManager`, `EmailCenter`, `SmtpConfigModal`, `MasterDataExport`), `employee-management` (`ImportModal` para `/api/import/preview`), `sidebarMenu`, `App.tsx`

---

## 1. Alcance e Inventario AS-IS

### 1.1 Rutas y Permisos Frontend

- **Ruta principal:** `#/configuration` (`ROUTES.CONFIGURATION = "/configuration"`, `frontend/src/App.tsx:347-354`).
  - Protegida por `<ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED]}>`.
  - Sincroniza la pestaña activa con `?tab=` (`useConfigurationData.ts:19-38`):
    1. `variables` (default) -> `GlobalVariablesManager`
    2. `email` -> `EmailCenter` + `SmtpConfigModal`
    3. `master-data` -> `MasterDataExport`
- **Redirecciones legacy (`frontend/src/App.tsx:208-223`):**
  - `#/email-center` -> `<Navigate to="/configuration?tab=email" replace />`
  - `#/master-data-data-export` -> `<Navigate to="/configuration?tab=master-data" replace />`
  - Ambas protegidas por `[ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED]`.
- **Sidebar (`frontend/src/hooks/layout/sidebarMenu.ts:46-62, 127`):**
  - `Fiscalizador` y `Usuario` retornan temprano sin el ítem `Config`.
  - `Administrador`, `Supervisor_Elevado`, `Supervisor` y `Reloj_Control` reciben `{ to: ROUTES.CONFIGURATION, label: "Config" }` incondicionalmente en línea `127`.
- **Reportes programados (`/api/scheduled-reports*`):**
  - Existen tipos OpenAPI generados en `frontend/src/types/api-schema.ts:1500-1650`, pero **no existe** servicio, hook ni vista en frontend que los consuma.
- **Importación (`/api/import/preview`):**
  - No vive en `#/configuration`, sino en `frontend/src/features/employee-management/components/ImportModal.tsx` vía `importService.previewImport`.

### 1.2 Endpoints Backend

#### A. `/api/configs*` (`backend/src/modules/configs/http/routes.ts`)

| Método y Ruta                                 | Auth / Roles                   | Función AS-IS                                                                                                                                             |
| :-------------------------------------------- | :----------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/configs/public/company-policy`      | Público                        | Retorna metadata `company_policy_meta` o `null`.                                                                                                          |
| `GET /api/configs/public/company-policy/file` | Público                        | Descarga PDF inline de reglamento interno.                                                                                                                |
| `GET /api/configs/public/brand-logo`          | Público                        | Retorna config `branding_logo` validada o `null`.                                                                                                         |
| `GET /api/configs/public/brand-logo/file`     | Público                        | Descarga imagen PNG/JPG/WebP inline del logo.                                                                                                             |
| `GET /api/configs/server-time`                | `auth` (cualquier autenticado) | Retorna hora del servidor en `America/Santiago`.                                                                                                          |
| `GET /api/configs/validate-closure`           | `elevated` (`Administrador`)   | Valida fecha de cierre contable (`req.query.date`, `noQuery` en schema de ruta).                                                                          |
| `GET /api/configs`                            | `auth`                         | Lista configs; filtra `PROTECTED_KEYS` (`SMTP_CONFIG`, `EMAIL_NOTIFICATION_RULES`) salvo `Administrador` o `Supervisor_Elevado`, y enmascara secretos.    |
| `GET /api/configs/:key`                       | `auth`                         | Obtiene una clave; lanza `403` en `PROTECTED_KEYS` si no es `Administrador` ni `Supervisor_Elevado`, y enmascara secretos.                                |
| `POST /api/configs/:key`                      | `elevated` (`Administrador`)   | Guarda cualquier clave en `system_configs` vía `ConfigService.set` (con `body: z.object({ value: z.unknown() })`). Valida `branding_logo` si corresponde. |
| `POST /api/configs/company-policy`            | `elevated` (`Administrador`)   | Upload multipart de PDF (máx 15 MB).                                                                                                                      |
| `POST /api/configs/brand-logo`                | `elevated` (`Administrador`)   | Upload multipart de imagen PNG/JPG/WebP.                                                                                                                  |

#### B. `/api/email/*` y `/api/scheduled-reports*` (`backend/src/modules/emailReports/http/routes.ts`)

Todas las rutas del plugin usan `base`: `onRequest: [options.authenticate, elevated]` donde `elevated` permite `["Administrador", "Supervisor_Elevado"]`.

| Método y Ruta                             | Validación                    | Función AS-IS                                                                                                                                      |
| :---------------------------------------- | :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/email/verify`                  | `SmtpVerifySchema` en flow    | Prueba conexión SMTP con `nodemailer.createTransport(...).verify()`. Resuelve `"********"` desde DB si coinciden `host`, `user`, `port`, `secure`. |
| `GET /api/email/config`                   | `noQuery`                     | Retorna `MultiSmtpConfig` (3 perfiles + `activeProfileIndex`) con `pass` enmascarado (`"********"` o `""`).                                        |
| `POST /api/email/config`                  | `MultiSmtpConfigSchema`       | Guarda 3 perfiles en `SMTP_CONFIG` vía `ConfigService.replace`, cifrando nuevas contraseñas con AES-256-GCM (`encrypt()`).                         |
| `GET /api/email/rules`                    | `noQuery`                     | Retorna `EMAIL_NOTIFICATION_RULES` (`autoCloseShift`, `latenessOver15`, `latenessOver60`).                                                         |
| `POST /api/email/rules`                   | `EmailRulesSchema`            | Guarda reglas vía `ConfigService.set`.                                                                                                             |
| `POST /api/email/send-test`               | `SendTestEmailSchema`         | Envía correo de prueba usando el perfil SMTP activo.                                                                                               |
| `GET /api/scheduled-reports`              | `noQuery`                     | Lista reportes programados ordenados por `createdAt desc`.                                                                                         |
| `GET /api/scheduled-reports/:id`          | `params: { id }`              | Obtiene reporte por ID o `404`.                                                                                                                    |
| `POST /api/scheduled-reports`             | `ScheduledReportInputSchema`  | Crea reporte, calcula `nextRunAt` en `America/Santiago` y llama `refreshScheduler()`.                                                              |
| `PUT /api/scheduled-reports/:id`          | `ScheduledReportUpdateSchema` | Actualiza con `FOR UPDATE`, valida `hasReportTarget`, recalcula `nextRunAt` y llama `refreshScheduler()`.                                          |
| `PATCH /api/scheduled-reports/:id/toggle` | `params: { id }`              | Alterna `isActive`, recalcula `nextRunAt` al activar y llama `refreshScheduler()`.                                                                 |
| `DELETE /api/scheduled-reports/:id`       | `params: { id }`              | Elimina con `FOR UPDATE`, llama `refreshScheduler()`, responde `204`.                                                                              |

#### C. `POST /api/import/preview` (`backend/src/modules/importExport/http/routes.ts:45-77`)

- **Auth:** `["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"]`.
- **Multipart:** acepta archivo `.xlsx` hasta 50 MB y campo `schema` JSON opcional. Parsea con `ExcelJS` (`importWorkbook.ts`) y devuelve `{ rows, total }`.

### 1.3 Scheduler & Persistencia

- **Inicialización (`backend/src/services/runtimeJobs.ts:239-245`):** `createRuntimeJobs()` programa `lifecycle.after(5000, ...)` para ejecutar `initializeScheduler()`.
- **`initializeScheduler()` (`backend/src/services/schedulerService.ts:102-122`):**
  1. Arranca `startMaintenanceJobs()` (corre `runMaintenance()` inmediatamente y programa timer diario a medianoche).
  2. Carga reportes activos de `scheduled_reports` y programa timers encadenados (`setTimeout` con chunking de 32-bit) hacia `nextRunAt` (`America/Santiago`).
- **Ejecución de reporte (`executeReportWork`):** usa exclusión in-process (`workCoordinator.exclusive`) + reclamo optimista multi-instancia (`updateMany` sobre `nextRunAt` cuando `onlyDue === true`), genera PDF vía `exportService.generateReportPDF` y envía correo con adjunto por cada destinatario.
- **Persistencia Prisma:** `SystemConfig` (`system_configs`), `ScheduledReport` (`scheduled_reports`) y `AuditLog` (`audit_logs`, redactando `SMTP_CONFIG` y `EMAIL_NOTIFICATION_RULES`). Las mutaciones críticas usan `withDirectTransaction` (`pg_advisory_xact_lock` o `FOR UPDATE`). Contraseñas SMTP cifradas con AES-256-GCM derivando clave de `SHA-256(JWT_SECRET)`.

---

## 2. Riesgos y Hallazgos Preliminares (Pendientes de Reproducción en Fase 2)

1. **Seguridad / Integridad en `POST /api/configs/:key`**: permite a `Administrador` sobrescribir `SMTP_CONFIG` o `EMAIL_NOTIFICATION_RULES` sin pasar por `MultiSmtpConfigSchema`/`EmailRulesSchema` ni cifrar con `encrypt()` (`routes.ts:92-103`, `ConfigService.ts:88-97`).
2. **Inyección HTML en correos**: `schedulerService.ts:252` interpola `${report.name}` sin escapar y `EmailService.ts:246` convierte `\n` a `<br>` sin escapar HTML en `message`.
3. **SSRF / Port-probing SMTP**: `SmtpVerifySchema` y `POST /api/email/config` no bloquean IPs privadas/loopback/link-local.
4. **Cifrado SMTP acoplado a `JWT_SECRET` y descifrado fuera de `try/catch`**: `EmailService.ts:222,263` llama `getSmtpConfig()` fuera del `try/catch`; si `decrypt()` falla (rotación de `JWT_SECRET` o dato corrupto), lanza excepción no controlada.
5. **Inconsistencia de roles**:
   - Frontend: `sidebarMenu.ts:127` muestra `Config` a `Supervisor` y `Reloj_Control`, quienes son rechazados por `ProtectedRoute` (`App.tsx:350`).
   - Backend: `Supervisor_Elevado` puede leer y guardar `SMTP_CONFIG`/`EMAIL_NOTIFICATION_RULES` vía `/api/email/*`, pero `POST /api/configs/:key` solo permite `Administrador` (aunque `GET /api/configs/:key` sí deja leer esas claves a `Supervisor_Elevado`).
6. **Reportes programados sin UI + bugs de scheduler**:
   - No hay pantalla ni servicio frontend para `/api/scheduled-reports*`.
   - `refreshScheduler()` es solo en memoria local (no sincroniza entre réplicas).
   - `startMaintenanceJobs()` corre sin `LockService.withLock` y usa `console.warn`/`console.error`.
   - `getReportTypeName` omite `"calendar"`, `"detailed"` y `"shift_report"`.
   - `executeReportWork` aborta destinatarios al primer fallo y deja `delivered=false` tras haber enviado a los primeros.
   - `ScheduledReportService.normalize` no filtra strings vacíos en `recipients`.
   - `GET /api/configs/validate-closure` usa `noQuery` en el schema de ruta aunque lee `req.query.date`.
7. **Límites y bugs en `POST /api/import/preview`**:
   - Carga `.xlsx` hasta 50 MB sin tope de filas ni paginación (riesgo OOM/zip bomb).
   - Múltiples campos `schema` se concatenan con `,` rompiendo `JSON.parse`.
   - Ignora tipos distintos de `"String"` y flags `required` en `parseMapping`.
8. **Bugs frontend en `#/configuration`**:
   - `SmtpConfigModal` valida solo `currentSlot` y no los 3 perfiles ni maneja `profiles[currentSlot]` indefinido.
   - `EmailCenter`: `handleSaveRules` no valida `emailRulesFormSchema` ni tiene estado `isSaving`; `emailService.getRules` retorna `false` silencioso ante fallo de red/500 (riesgo de sobrescritura); `To:` tiene clase `uppercase`; `Server: Online` en `MasterDataExport` está hardcodeado.
   - `GlobalVariablesManager`: `updateConfig` (`mutateAsync`) sin `try/catch` en altas; fallback `["info@test.lan"]` en `useConfigQuery.ts:74`; `logoWidthInput`/`logoHeightInput` no sincronizan con valor cargado; typo `"NUEVO PROCOLO/TIPO"`.
   - Brechas de accesibilidad (`SmtpConfigModal` sin `role="dialog"`/`aria-modal`/Escape, inputs/switches/labels sin asociación).

---

## 3. Evidencia de Reproducción (Fase 2 — 2026-11-18)

### 3.1 Backend (PostgreSQL 18.4 + Fastify aislado)

1. **`POST /api/configs/:key` bypass SMTP & Rules (P0 — Confirmado):** `POST /api/configs/SMTP_CONFIG` con `{"value":{"arbitraryField":"pwned","pass":"plaintext-secret-123"}}` respondió `200` y persistió `pass` en texto plano en `system_configs`. `POST /api/configs/EMAIL_NOTIFICATION_RULES` guardó reglas arbitrarias sin validar `EmailRulesSchema`.
2. **SSRF / host interno en `POST /api/email/verify` y `POST /api/email/config` (P1 — Confirmado):** aceptó `127.0.0.1:25` y `169.254.169.254:80`, invocando `nodemailer.createTransport` y persistiendo `169.254.169.254`.
3. **Bugs en `EmailService`, `schedulerService` y `ScheduledReportService` (P1/P2 — Confirmados):**
   - `getSmtpConfig()` fuera de `try/catch`: payload GCM corrupto provocó `500` en `POST /api/email/send-test` y rechazo no capturado en `sendEmailWithAttachment`.
   - Inyección HTML sin escape en `sendTestEmail` (`message`) y `executeReport` (`report.name`).
   - `executeReportWork` aborta al primer destinatario fallido y deja `lastRunAt: null` aunque haya enviado a destinatarios previos.
   - `getReportTypeName` imprime `"calendar"` literal (no mapea `calendar`, `detailed`, `shift_report`).
   - `ScheduledReportService.normalize` retiene strings vacíos en `recipients` cuando hay comas extra.
4. **`GET /api/configs/validate-closure` (P2 — Confirmado):** `?date=not-a-date` pasa `preHandler: noQuery` (`z.unknown()`) y retorna `200`.
5. **`POST /api/import/preview` (P1/P2 — Confirmado):** 1501 filas retornadas completas sin tope; múltiples campos `schema` se concatenan con `,` rompiendo `JSON.parse` (`400`); ignora `type != "String"` y `required: true`.
6. **Asimetría `Supervisor_Elevado` vs `Administrador` (P2 — Confirmado):** `Supervisor_Elevado` recibe `200` en `POST /api/email/rules` y `GET /api/configs/SMTP_CONFIG`, pero `403` en `POST /api/configs/EMAIL_NOTIFICATION_RULES`.

### 3.2 Frontend (Staging `http://127.0.0.1:8080` + Vitest)

1. **Sidebar vs `ProtectedRoute` (P1 — Confirmado):** `Supervisor` y `Reloj_Control` ven `Config` (`data-testid="nav-item-configuration"`) en el sidebar, pero al navegar `ProtectedRoute` los redirige con error de acceso denegado.
2. **Ausencia de UI para `/api/scheduled-reports*` (P1 — Confirmado):** `#/configuration` solo tiene 3 tabs (`variables`, `email`, `master-data`) y `0` llamadas a `/api/scheduled-reports*`.
3. **`GlobalVariablesManager` (P1/P2 — Confirmados):** fallback engañoso `info@test.lan` cuando falta `email_recipients`; `POST /api/configs/*` con `500` genera `pageerror` no capturado en `handleAddArea`/`WorkdayType`/`EmailRecipient`; `logoWidthInput`/`logoHeightInput` quedan en `512`/`188` sin sincronizar con valor guardado; typo `"NUEVO PROCOLO/TIPO"`; `<Switch>` sin `aria-label`.
4. **`EmailCenter` y `SmtpConfigModal` (P1/P2 — Confirmados):** `SmtpConfigModal` permite activar un slot vacío y guardar sin validar los 3 slots, carece de `role="dialog"`/`aria-modal`/`Escape`/`aria-label` en botón cerrar; `handleSaveRules` envía regla activa con `recipient: ""` y sin `disabled`/`loading`; `emailService.getRules` retorna `false` silencioso en fallo; input `Para:` tiene clase `uppercase`; checkboxes de `RuleEditor` sin `id`/`aria-label`/`label for`.
5. **`MasterDataExport` (P2 — Confirmado):** `"Server: Online"` estático y `<label>` de fechas sin `htmlFor`.

---

## 4. Cierre y Verificación Post-Fix (Spec 119 — 2026-11-18)

- **Backend (`0894d31`)**:
  - `POST /api/configs/:key` bloquea `SMTP_CONFIG` y `EMAIL_NOTIFICATION_RULES` con `403`.
  - `GET /api/configs/validate-closure` valida `query.date` (`YYYY-MM-DD`, `400` en formato inválido).
  - Protección SSRF SMTP (`utils/smtpHostGuard.ts` con override `SMTP_ALLOW_PRIVATE_HOSTS`), `getSmtpConfig()` dentro de `try/catch`, y `escapeHtml` (`utils/htmlEscape.ts`) en `EmailService.sendEmail` y `schedulerService`.
  - `schedulerService`: `getReportTypeName` completo, envío independiente por destinatario (`Promise.allSettled`), `logger` + `LockService.withLock` en `startMaintenanceJobs`; `ScheduledReportService.normalize` filtra vacíos.
  - `POST /api/import/preview`: rechaza múltiples `schema`, tope `5000` filas, valida `required` y coerción de tipos.
- **Frontend (`d3ba683`, `200b019`)**:
  - `sidebarMenu.ts`: `Config` visible solo para `Administrador` y `Supervisor_Elevado`.
  - `GlobalVariablesManager`: sin fallback `info@test.lan`, manejo de errores en `updateConfig` (incluyendo `<Switch>` Control Interno), sincronización de dimensiones del logo, label `"NUEVO PROTOCOLO/TIPO"`, `aria-label` en `<Switch>`.
  - `EmailCenter` & `SmtpConfigModal`: `getRules` propaga error y bloquea guardado, `emailRulesFormSchema` + `isSavingRules`, `Para:` sin `uppercase`, `id`/`aria-label` en checkboxes, modal accesible (`role="dialog"`, `aria-modal`, `Escape`, `aria-label="Cerrar"`), validación por perfil activo/parcial sin exigir otros slots vacíos.
  - `MasterDataExport`: `htmlFor`/`id` en pickers de fecha, sin `"Server: Online"` estático.
  - Nueva pestaña `scheduled-reports` (`ScheduledReports`) en `#/configuration` con CRUD completo, toggle y eliminación.
- **Verificación en vivo (`http://127.0.0.1:8080`)**: todos los checks API y Playwright headless PASS (`0` `console.error`, `0` `pageerror` tras el fix `200b019`).
