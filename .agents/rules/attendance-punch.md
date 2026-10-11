---
trigger: model_decision
description: Domain invariants for attendance punch flows, full-day leave guard, future-date rejection, and users-read role alignment.
---

# Attendance Punch & Leave Invariants

Reglas de dominio para `PunchService`, `LeaveService`, `recordFlows`, correcciones y `GET /api/users`.
Evidencia: `specs/028-worker-portal-hardening/`, `specs/029-kiosk-hardening/`, `specs/030-full-day-leave-punch-guard/`.
No duplicar lo ya cubierto en [api-contracts.md](file:///.agents/rules/api-contracts.md) ni en
[frontend-performance.md](file:///.agents/rules/frontend-performance.md); aquí solo invariantes de dominio.

## 1. Contrato de punch (camelCase canónico)

- `PunchSchema.forcedType` es canónico camelCase: `entrada | salida | inicioColacion | finColacion`.
- El frontend envía siempre canónico; el backend normaliza el legacy snake
  (`inicio_colacion` / `fin_colacion`) en `determineNextPunchAction`, nunca al revés.
- El punch crea/resuelve la jornada con `serverDate` / `serverTime` (fecha de negocio Chile).
  Nunca usar la fecha del cliente para seleccionar la jornada: una fila con `date !== hoy`
  no es la jornada actual.

## 2. Guard de licencia de día completo (`ON_LEAVE`)

- Fuente de verdad: `LeaveRecord` vigente hoy
  (`startDate <= hoy <= endDate`, `isDeleted: false`), no el `status` del `TimeRecord`.
- Con licencia/vacación/permiso vigente: 400 `ON_LEAVE` con mensaje ES accionable
  ("elimine la licencia con un supervisor"), sin crear ni modificar filas.
- La búsqueda de jornada abierta debe ignorar filas de otros días:
  futura (`date > hoy`) → `null`; licencia pasada sin punches → `null`.
  Las huérfanas con punches conservan el flujo actual (autocierre).
- `clockStatus` mapea `Vacaciones` / `Permiso` a estado "fuera": el botón puede ofrecerse,
  pero el backend deniega y el frontend muestra el mensaje del backend, no el genérico.

## 3. Rechazo de fecha futura

- Vectores reales: `save` / `bulk` aceptan `date` arbitrario, corrección con
  `datetime-local` sin tope, `resolve-anomaly` virtual `MISSING-<emp>-<date>`.
- `save` / `bulk` / `resolve` rechazan `date > businessDate(now)` (fecha de negocio Chile),
  después del chequeo de periodo cerrado para no alterar su precedencia.
- `CorrectionRequestSchema` lleva `refine(requestedValue <= now)` más guard a nivel servicio
  en `create` y en `updateStatus` al aprobar. Frontend: el controller bloquea el futuro
  y el input lleva `max` acotado a hoy.

## 4. Lectura de usuarios alineada con roles

- `GET /api/users` admite `Administrador` + `Supervisor_Elevado` (solo lectura);
  `POST` / `PUT` / `DELETE` siguen admin-only.
- Toda ruta de frontend que liste usuarios debe reflejar exactamente ese conjunto de roles.
  Un 403 nunca se traga en silencio: logger estructurado + estado vacío/error informativo,
  nunca página en blanco. Acciones solo-`hover` deben usar `focus-within` para teclado.

## 5. Tests exigidos por cambio en este dominio

- `recordFlows`: mapeo `ON_LEAVE`, rechazo de futuro en `save` / `bulk`, mapeo `FUTURE_DATE` en `resolve`.
- `correctionSchemas`: `refine` acepta pasado y rechaza futuro.
- Kiosk / worker-portal: denegación por licencia muestra el mensaje backend en un único toast;
  doble invocación concurrente dispara un solo punch.
- `UserManagementView`: estado vacío informativo. Controller del modal: rechaza futuro y expone `max`.
