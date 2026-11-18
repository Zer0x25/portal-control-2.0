# Flujo: Permisos, ausencias y feriados (`permisos-ausencias-y-feriados`)

- **Estado:** `CON_HALLAZGOS` — Fase 2 completada el 2026-11-18 con replicación en PostgreSQL 18.4 efímero, Fastify inject y Playwright headless sobre staging (`http://127.0.0.1:8080`). Pendiente definición de `DUDA-01..03` para pasar a Fase 3 (SDD).
- **Última actualización:** 2026-11-18
- **Módulos / actores:** `theoretical-shifts` (pestañas `leaves` y `holidays`), `leaves`, `holidays`, `LeaveService`, `HolidayService`, `useLeaveManagerController`, `useHolidayManagerController`, `useTimeRecords`, `schedulingService`. En UI, `#/theoretical-shifts` admite `Administrador`, `Supervisor_Elevado` y `Supervisor` (`App.tsx`). En API, `/api/leaves*` (GET/POST/DELETE) y las escrituras de `/api/holidays*` (`POST /api/holidays`, `POST /api/holidays/bulk`, `POST /api/holidays/sync`, `DELETE /api/holidays/:id`) admiten `Administrador`, `Supervisor_Elevado`, `Supervisor` y `Reloj_Control`; `GET /api/holidays` admite cualquier usuario autenticado.
- **Entradas:** UI `#/theoretical-shifts?tab=leaves` (`LeaveManager`), `#/theoretical-shifts?tab=holidays` (`HolidayManager`); API `GET/POST /api/leaves`, `DELETE /api/leaves/:id`, `GET/POST /api/holidays`, `POST /api/holidays/bulk`, `POST /api/holidays/sync`, `DELETE /api/holidays/:id`.
- **Alcance de evidencia:** Fase 1 (inspección estática) + Fase 2 (ejecución de pruebas unitarias e integración Fastify/PostgreSQL 18.4, replicación HTTP en Fastify + PostgreSQL efímero y Playwright headless en staging `http://127.0.0.1:8080`).

## 1. Diagrama AS-IS

```mermaid
flowchart TD
  A["#/theoretical-shifts?tab=leaves (LeaveManager)"] --> B["useLeaveManagerController + buildLeaveFormSchema"]
  B --> C["useLeaveMutations.createLeave -> POST /api/leaves"]
  C --> D["LeaveService.upsert (withDirectTransaction + pg_advisory_xact_lock)"]
  D --> E["Prisma LeaveRecord + materializeDays -> TimeRecord + sealAfterMutation"]
  B --> F["useTimeRecords.justifyRecordsForLeave -> 2do POST /api/leaves (sin id)"]

  G["#/theoretical-shifts?tab=holidays (HolidayManager)"] --> H["useHolidayManagerController + buildHolidayFormSchema"]
  H --> I["GET /api/holidays (auto-sync Boostr si año vacío y !DISABLE_HOLIDAY_AUTOSYNC)"]
  H --> J["POST /api/holidays | POST /api/holidays/sync | DELETE /api/holidays/:id"]
  J --> K["HolidayService -> Prisma Holiday (upsert por date) + AuditLog + Socket.IO"]
```

## 2. Comportamiento observado en código

### 2.1 Ausencias y licencias (`#/theoretical-shifts?tab=leaves` y `/api/leaves*`)

- `TheoreticalShifts.view.tsx` carga de forma diferida `LeaveManager.container.tsx` cuando `activeTab === "leaves"`.
- `useLeaveManagerController.ts` consulta `useLeavesInfiniteQuery({ showArchived, employeeId })` (páginas de 50) y filtra `filterEmployeeName` y `filterType` en cliente sobre las páginas ya descargadas. El formulario usa `useAppForm` con `buildLeaveFormSchema` (`frontend/src/schemas/forms/leave.ts`), que valida en cliente rango `startDate <= endDate`, antigüedad máxima de 7 días hábiles al crear, `endDate >= today` al editar, y solapamiento contra los `leaves` ya cargados.
- En `LeaveManager.view.tsx`, al editar (`editingLeave !== null`) se deshabilitan empleado, tipo y fecha de inicio (`disabled={!!editingLeave}`), permitiendo modificar `endDate` y `notes`.
- Al enviar el formulario, `useLeaveManagerController.onSubmit` ejecuta `createLeave(...)` (`POST /api/leaves`) y, acto seguido, invoca `justifyRecordsForLeave(...)` (`useTimeRecords.ts`), que ejecuta una segunda mutación `POST /api/leaves` sin `id` y con `notes: "Justificación masiva"`.
- En backend (`backend/src/modules/leaves/http/routes.ts`, `flows.ts` y `LeaveService.ts`):
  - `GET /api/leaves` pagina con `LeaveQuerySchema`, oculta `isDeleted: true` cuando no viene `since`, y oculta archivados (`endDate < today`) cuando `!showArchived && !startDate && !endDate`. Aunque `LeaveService.list` contiene una rama `if (user.role === "Usuario" && user.employeeId)`, el hook `supervisor` de la ruta bloquea con `403` a cualquier rol distinto de `Administrador`, `Supervisor_Elevado`, `Supervisor` y `Reloj_Control`.
  - `POST /api/leaves` valida el body con `LeaveRecordSchema` y ejecuta `LeaveService.upsert` dentro de `withDirectTransaction` con bloqueo `pg_advisory_xact_lock(hashtext("punch:" + employeeId))` y `SELECT ... FROM employees WHERE id = ... FOR UPDATE`. Verifica existencia de empleado (`404`), reglas de edición (`CANNOT_EDIT_FINALIZED`, `IMMUTABLE_FIELDS_CHANGED`, `INVALID_END_DATE_PAST`), antigüedad de 7 días hábiles al crear (`LIMIT_7_DAYS_EXCEEDED`), y solapamiento activo (`409 LEAVE_OVERLAP`).
  - Tras guardar `LeaveRecord`, `materializeDays` crea o reactiva `TimeRecord` por cada día del rango (`status: leave.type`, `source: "SYSTEM_LEAVE"`, `scheduledHours: 0`) omitiendo días con marcaje manual (`hasPunch`) o que pertenezcan a otra licencia activa, y sella la cadena criptográfica con `sealAfterMutation` en orden `id ASC`. Al acortar una licencia existente, `archiveDays` archiva los `TimeRecord` sobrantes generados por esa licencia. Emite `leave:updated` y `timeRecord:updated`.
  - `DELETE /api/leaves/:id` ejecuta `LeaveService.delete` bajo transacción y lock: exige `startDate >= today - 7 días hábiles`, bloquea borrado de archivadas salvo que hayan sido creadas en las últimas 24 h (`ARCHIVE_PROTECTION_VIOLATED`), archiva los `TimeRecord` futuros (`date >= today`) generados por la licencia y marca `LeaveRecord` con `isDeleted: true`, `deletedAt: new Date()` y `endDate: yesterday`.

### 2.2 Feriados (`#/theoretical-shifts?tab=holidays` y `/api/holidays*`)

- `TheoreticalShifts.view.tsx` carga `HolidayManager.container.tsx` cuando `activeTab === "holidays"`.
- `useHolidayManagerController.ts` consulta `useHolidaysInfiniteQuery({ pageSize: 50, showArchived })`, ordena descendente por `date` y filtra en cliente `date >= today` cuando `!showArchived`. El formulario usa `buildHolidayFormSchema` (`frontend/src/schemas/forms/holiday.ts`), que valida `date`, `name` (mínimo 2 caracteres), `type` (`Nacional`, `Regional`, `Específico`) y que `date` no esté en `existingDates`.
- `HolidayManager.view.tsx` permite crear, editar, eliminar y ejecutar «Cargar Feriados» (`syncHolidays()`, que llama `POST /api/holidays/sync` sin parámetro explícito de año, usando por defecto `new Date().getFullYear()`).
- En backend (`backend/src/modules/holidays/` y `HolidayService.ts`):
  - `GET /api/holidays` admite cualquier usuario autenticado. Soporta `since`, `page`, `pageSize`, `search` y `showArchived`. Si no viene `since`, `DISABLE_HOLIDAY_AUTOSYNC !== "true"` y `countYear(currentYear) === 0`, dispara `syncExternalHolidays(currentYear)` contra `https://api.boostr.cl/holidays/${year}.json` (con timeout de 5 s, ignorando errores si Boostr falla). Devuelve `HolidayRecord[]` si no hay paginación o `{ data, meta }` si vienen `page` y `pageSize`.
  - `POST /api/holidays` y `POST /api/holidays/bulk` persisten mediante `prisma.holiday.upsert({ where: { date }, update: { name, type }, create: { id, date, name, type } })`, registran auditoría (`HOLIDAY_UPSERT` / `HOLIDAY_BULK_UPSERT`) y emiten `holiday:updated`.
  - `POST /api/holidays/sync` consulta Boostr, ejecuta upserts en paralelo (`Promise.all`), registra `HOLIDAY_SYNC`, emite `holiday:updated` y responde `{ success: true, total, year }`.
  - `DELETE /api/holidays/:id` busca resumen previo (`findSummary`), ejecuta `prisma.holiday.delete({ where: { id } })`, registra `HOLIDAY_DELETE` (`WARNING`) y responde `204`.

### 2.3 Integración transversal

- `schedulingService.ts` consulta `leaveRecord` (`isDeleted: false`) y `holiday` para resolver el calendario y turnos teóricos con prioridad **Licencia > Feriado > Patrón de turno > Sin asignación**.
- `PunchService.ts` consulta `leaveRecord` activo al momento de marcar; `ShiftValidator.ts` y `shiftService.ts` consultan `leaveRecord` para reglas de conflictos/descanso; `EmployeeService.ts` limpia o cierra `leaveRecord` al archivar/eliminar empleados.

## 3. Anomalías y riesgos para replicación

1. **[ANOMALÍA-01] `useLeaveManagerController.onSubmit` duplica `POST /api/leaves` y provoca `409 LEAVE_OVERLAP`.** Después de `createLeave` (`POST /api/leaves`), `onSubmit` llama a `justifyRecordsForLeave` (`useTimeRecords.ts`), que envía un segundo `POST /api/leaves` sin `id` para las mismas fechas, chocando con la ausencia recién creada y dejando abierto el formulario con toast de error.
2. **[ANOMALÍA-02] `POST /api/holidays/sync` vs `useHolidayMutations`: toast muestra `undefined feriados nuevos cargados.`.** Backend responde `{ success, total, year }`, mientras `holidayService.ts` / `useHolidayMutations.ts` leen `data.added` (inexistente).
3. **[ANOMALÍA-03] Edición de feriado por `date` en vez de `id`, y campo fantasma `isRenounceable`.** `prismaHolidayCommands.upsert` usa `where: { date }`, por lo que editar la fecha de un feriado existente crea una fila nueva en lugar de mover el registro original; además, crear un feriado en una fecha archivada (oculta cuando `!showArchived`) la sobreescribe silenciosamente en vez de advertir duplicado. `HolidaySchema` y `holidayFormSchema` declaran `isRenounceable`, pero `model Holiday` en Prisma no tiene esa columna.
4. **[ANOMALÍA-04] Manejo de errores en `DELETE /api/holidays/:id` y filtros/paginación en ausencias.** `DELETE /api/holidays/:id` con `id` inexistente ejecuta `prisma.holiday.delete` sin verificar existencia previa ni mapear `P2025` en el servicio/flujo (riesgo de `500` en vez de `404`). En `LeaveManager`, la búsqueda por nombre y filtro por tipo operan en cliente solo sobre páginas cargadas de 50 registros.
5. **[ANOMALÍA-05] `LeaveService.delete` sobrescribe `endDate` al día anterior.** Al eliminar una licencia (`DELETE /api/leaves/:id`), además de `isDeleted: true` y `deletedAt`, muta `endDate` a `yesterday` en horario de Chile, alterando el rango histórico original.
6. **[ANOMALÍA-06] Desalineación de roles en `Reloj_Control`, `Usuario` y `Fiscalizador`.** `Reloj_Control` tiene acceso completo de escritura en `/api/leaves*` y `/api/holidays*` en API, pero `App.tsx` bloquea `#/theoretical-shifts` para ese rol. En `GET /api/leaves`, existe una rama para `Usuario` en `LeaveService.list` que nunca se alcanza porque `leavesPlugin` exige rol supervisor antes.
7. **[ANOMALÍA-07] `GET /api/holidays` ejecuta auto-sync externo durante un `GET` y retorna contrato dual.** Si `countYear(year) === 0` y no está deshabilitado por env, `GET /api/holidays` llama a `api.boostr.cl` síncronamente (hasta 5 s de latencia); además retorna arreglo plano o `{ data, meta }` según `page`/`pageSize`.

## 4. Dudas para revisión humana

El usuario aprobó las tres definiciones el 2026-11-18 e incorporadas en la [spec 115](../../specs/115-corregir-permisos-ausencias-y-feriados/spec.md):

1. **[DUDA-01] DECIDIDA (opción 1.A):** `Reloj_Control` y `Fiscalizador` operan en **solo lectura** en `/api/leaves` y `/api/holidays`, manteniendo `#/theoretical-shifts` bloqueado para ambos.
2. **[DUDA-02] DECIDIDA (opción 2.B):** Agregar columna `is_renounceable` (`isRenounceable`) a `Holiday` mediante migración Prisma, poblarla desde Boostr (`!inalienable`), exponerla en `HolidayForm` y listas, y actualizar por `id` al editar feriados.
3. **[DUDA-03] DECIDIDA (opción 3.A):** Preservar el `endDate` original del `LeaveRecord` en `DELETE /api/leaves/:id` al marcar `isDeleted: true` y `deletedAt`.

## 5. Inventario de pruebas y plan para Fase 2

| Área | Evidencia de pruebas existentes (ejecutadas en Fase 2) | Resultado observado |
| :--- | :--- | :--- |
| Backend `leaves` (API, reglas, materialización) | `backend/tests/unit/leaveCorrectionFlows.test.ts` (4/4), `backend/tests/fastify-integration/leavesCorrections.test.ts` (42/42 en PostgreSQL 18.4) | **46/46 OK**. |
| Backend `holidays` (API, sync, arquitectura) | `backend/tests/unit/holidayService.test.ts` (11/11), `holidayService.sync.test.ts` (6/6), `holidays/getHolidays.test.ts` (7/7), `backend/tests/fastify-integration/holidays.test.ts` (7/7), `backend/tests/holidays-architecture.test.ts` (120/122; 2 fallos previos ajenos en `Employees` y `Records`) | **31/31 OK** en pruebas propias de `holidays`. |

## 6. Hallazgos confirmados en Fase 2 (Replicación controlada)

1. **`BUG-01` (Alta) — Doble `POST /api/leaves` al registrar una ausencia en `LeaveManager`:**
   - **Evidencia Playwright (`#/theoretical-shifts?tab=leaves`):** Al registrar ausencia (`2026-11-18`..`2026-11-18`), `useLeaveManagerController.onSubmit` dispara 2 peticiones `POST /api/leaves` con ~47 ms de diferencia: la 1ª responde `201` (toast `ÉXITO Ausencia registrada exitosamente`) y la 2ª (vía `justifyRecordsForLeave` sin `id` y `notes: "Justificación masiva"`) responde `409` `LEAVE_OVERLAP` (`"La ausencia se superpone con otra ausencia activa."`), mostrando toast `ERROR`, error de consola `409 (Conflict)` y dejando el formulario abierto sin resetear.
2. **`BUG-02` (Media) — Toast `undefined feriados nuevos cargados.` al sincronizar feriados:**
   - **Evidencia API + Playwright (`#/theoretical-shifts?tab=holidays`):** `POST /api/holidays/sync` (`{"year":2026}`) responde `200` `{"success":true,"total":16,"year":2026}`. `useHolidayMutations.ts` lee `data.added`, mostrando el toast `ÉXITO undefined feriados nuevos cargados.`.
3. **`BUG-03` (Media) — Error `409 CONFLICT` al cambiar la fecha de un feriado existente:**
   - **Evidencia API + Playwright:** Al editar un feriado creado (`2026-11-25`, `id: 01M7QK3D012EV89JK3VTZ7GZD4`) y cambiarle la fecha a `2026-11-26`, el backend ejecuta `prisma.holiday.upsert({ where: { date } })` e intenta `create` con el `id` existente, fallando por `Unique constraint` en `holidays_pkey` con `409 CONFLICT` (`"Ya existe un registro con este unknown"`). En la UI se muestra el toast de error y el feriado no se actualiza.
4. **`BUG-04` (Baja) — Campo fantasma `isRenounceable` en `HolidaySchema`:**
   - **Evidencia API + DB:** `POST /api/holidays` con `isRenounceable: true` responde `201` pero descarta el campo porque `model Holiday` en Prisma no lo define. (`DELETE /api/holidays/non-existent-id` sí devuelve `404 NOT_FOUND` correctamente).
5. **`BUG-05` (Media) — Desalineación de roles (`Reloj_Control` y `Usuario`):**
   - **Evidencia API + Playwright:** En API, `Reloj_Control` obtiene `200` en `GET /api/leaves` y `201` en `POST /api/leaves`; en Playwright, al navegar a `#/theoretical-shifts` es bloqueado y redirigido a `#/dashboard`. `Usuario` y `Fiscalizador` reciben `403` en `GET /api/leaves` (la rama `user.role === "Usuario"` en `LeaveService.list` es código muerto).
6. **`BUG-06` (Baja) — Mutación de `endDate` al eliminar ausencia y filtrado parcial en cliente:**
   - **Evidencia DB:** `DELETE /api/leaves/:id` sobre licencia futura (`2026-11-19..2026-11-21`) devuelve `200`, marca `isDeleted: true` en `LeaveRecord` y `TimeRecord`, pero sobrescribe `endDate` del `LeaveRecord` a `"2026-11-17"` (ayer). En UI, `LeaveManager` filtra `filterEmployeeName` y `filterType` solo sobre las páginas cargadas (de a 50).
