# Tareas 034: Frontend HTTP Client Consolidation

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## Fase A — Fundaciones del cliente

- [ ] T1: Extender `frontend/src/services/apiClient.ts` con un helper
      `request<T>()` tipado contra `src/types/api` (`paths[P]` /
      `components["schemas"]`), con **dos modos de error**: _lanzar_
      `ApiHttpError` (comportamiento actual) y _devolver_ resultado tipado
      con `status` para endpoints donde el 404 es un caso de negocio
      (p. ej. `GET /brand-logo` sin logo configurado) (AC1, AC2).
- [ ] T2: Ampliar `apiClient` con las **capacidades que la migración exige**
      y que hoy faltan: (a) `patch()` (lo piden `shiftReportService.ts:70` y
      `correctionService.ts:78`); (b) **cuerpo `FormData`**, omitiendo el
      header `Content-Type` para que el navegador fije el `boundary` de
      `multipart/form-data` (lo piden `configService.ts:63,87` y
      `importService.ts:12`; hoy `post` fuerza `application/json` +
      `JSON.stringify(body)` y los corrompe); (c) **modo de respuesta
      binaria** que devuelve `{ blob, headers, filename? }` **sin** pasar por
      `response.text()` (que corrompe PDF/XLSX) y preservando el
      `Content-Disposition` que hoy leen `exportService.ts:61,110` (AC1).
- [ ] T3: Mover a `apiClient` la emisión del evento `rate_limited` (hoy en
      `src/services/fetchGuards.ts:27-38`), conservando **nombre, payload
      (`{status, url, retryAfter}`) y lock de 5 s anti-tormenta**; documentar
      la interacción con el retry 429 existente
      (`apiClient.ts:18,163-172`): el toast se emite en el primer 429 y el
      retry respeta `Retry-After` sin re-emitir el evento (AC4).
- [ ] T4: Suprimir los eventos globales en los **endpoints de autenticación
      anónima**: `apiClient` gana la opción `skipAuthEvents?: boolean` en
      `RequestOptions` (por defecto `false`) y la aplica **por defecto** a
      `/auth/login`, `/auth/mfa/validate` y `/auth/kiosk-login`, de modo que
      en ellos **no** se emitan ni `rate_limited` ni `unauthorized`
      (`apiClient.ts:306-308,326-328`). Preserva la exclusión que hoy hace
      `fetchGuards.ts:25` y evita la regresión de que un 401 por contraseña,
      PIN o código MFA incorrecto cierre la sesión
      (`src/store/useStore.ts:47-49`, `src/App.tsx:123`). `/auth/mfa/setup` y
      `/auth/mfa/verify` **conservan** el evento `unauthorized` (exigen
      sesión previa) (AC4).
- [ ] T5: Fijar el **dueño único del retry** en `apiClient`: `queries.retry`
      pasa a `false` en `src/lib/queryClient.ts` (un GET con 500/503 deja de
      generar 9 peticiones y genera 3) y el clasificador de status se
      corrige a `status >= 400 && status < 500 && status !== 408 && status !== 429`,
      de modo que 400/409/422 y demás 4xx no transitorios **nunca** se
      reintentan. **Eliminar los overrides por query** que
      contradicen la política: `SUPERVISOR_DASHBOARD_CONFIG`
      (`features/supervisor-dashboard/config/performance.ts:14,22,30` —
      `retry: 1`, `retry: 2`, `retry: 3`) y los `retry: false` redundantes de
      `useReportsQuery.ts:22`, `useHealthQuery.ts:78,86`,
      `useLeavesQuery.ts:17` y `useConfigQuery.ts:92` (AC2).
- [ ] T6: Añadir en `apiClient.spec.ts` los casos de regresión: 403 y 404
      **no** se reintentan; 400, 409 y 422 tampoco; 500 y 503 sí (GET, máx.
      2, con backoff); `Retry-After` respetado; timeout por
      `AbortSignal.timeout` (15 s) y composabilidad con la señal del
      llamante; dedup de GET en vuelo; `ApiHttpError` conserva `status`
      numérico; evento 429 emitido una sola vez; **supresión** de
      `rate_limited` y `unauthorized` en los 3 endpoints anónimos;
      respuesta binaria sin corrupción y con `Content-Disposition` legible;
      `FormData` enviado **sin** `Content-Type` manual; `patch()` operativo;
      y **nunca más de 3 peticiones HTTP** por fallo (AC2, AC3, AC4).
- [ ] T7: Nuevo `frontend/src/lib/queryClient.spec.ts` que fija
      `queries.retry === false` y el clasificador de 4xx no transitorio (AC2).
- [ ] T8: Extraer los **side-effects de DOM** de los services a los hooks de
      feature: `kpiService.ts:154-162,194-202` (`document.createElement` +
      `URL.createObjectURL` + `.click()`), `exportService.ts` y
      `shiftReportService.ts`; un service no crea nodos DOM ni dispara
      descargas. **Excepción de firma acotada a los 6 métodos `download*`**:
      pasan a `Promise<{ blob: Blob; filename: string }>` y el consumidor
      invoca el helper nuevo `triggerBrowserDownload(blob, filename)` en
      `src/utils/`, que preserva el comportamiento visible (incluida la
      variante `action: "print"` de `downloadCalendarPDF`, que pasa a
      `window.open` con object URL en el hook) (AC1).

## Fase B — Migración de services (5 PR, por riesgo)

- [ ] T9: Lote 1 — migrar `importService` (1 fetch), `exportService` (2),
      `correctionService` (5) y `auditLogService` (5) a `apiClient`;
      **firmas públicas y tipos de retorno intactos** (salvo la excepción
      de los 2 `download*` de `exportService`); los errores pasan a
      `ApiHttpError` con status; `correctionService` usa el `patch()` nuevo
      (AC1, AC2).
- [ ] T10: Lote 2 — migrar `schedulingService` (4), `shiftReportService` (6)
      y `kpiService` (6); mover los DTOs inline de
      `schedulingService.ts:7-39` a `src/types/`; el shaping de respuestas de
      `kpiService.ts:58-70` pasa a los tipos; `shiftReportService.update`
      usa el `patch()` nuevo (AC1, AC2).
- [ ] T11: Lote 3 — migrar `emailService` (7), `healthService` (7) y
      `seedingService` (7) (AC1, AC2).
- [ ] T12: Lote 3 (cont.) — migrar los **9 `fetch(` de los hooks de
      governance** hacia `healthService` / `apiClient`:
      `features/governance/hooks/useSystemMaintenanceController.ts` (8
      llamadas a `/admin/stats`, `/admin/diagnose-autoclose`,
      `/admin/trigger-autoclose`, `/admin/trigger-backup`,
      `/admin/purge-sessions`, `/admin/reset-password`,
      `/maintenance/clear-database` y `/admin/trigger-accounting-autoclose`)
      y `features/governance/hooks/useSecurityInsightsController.ts` (1
      llamada a `/admin/security-insights`). **No los cubre la spec 033**
      (su alcance de escaneo es `features/**/components/**`) y son lo que
      permite que el guardrail de AC9 tenga presupuesto 0 (AC1, AC2, AC9).
- [ ] T13: Lote 4 — migrar `holidayService` (8) y `configService` (10);
      verificar el caso "logo no configurado" (404 legítimo) en modo
      no-launching; `uploadBrandLogo` y `uploadCompanyPolicy` usan el
      cuerpo `FormData` nuevo (AC1, AC2).
- [ ] T14: Lote 5 (PR **aparte**, revisión reforzada) — migrar `authService`
      (5): login, MFA, PIN y expiración de sesión; e2e de smoke + user-flows +
      kiosk en verde antes de mergear; matriz de errores 401 / 403 / 429
      verificada. **Contrato de error preservado**: `login` sigue lanzando un
      error con el mensaje del backend (`data.message`) y `kioskVerifyPin`
      sigue **devolviendo** `{ success: false, message }` en lugar de
      lanzar; los 3 endpoints anónimos quedan sin eventos globales (T4) para
      que un 401 por credencial inválida no cierre la sesión (AC1, AC2, AC10).

## Fase C — Política de red única

- [ ] T15: Eliminar `src/services/fetchGuards.ts` y la llamada
      `installFetchGuards()` de `src/main.tsx:12`; el monkey-patch de
      `window.fetch` desaparece por completo del bundle (AC4).
- [ ] T16: Verificar que el toast de `rate_limited` en
      `src/store/useStore.ts:52-66` se sigue mostrando tras la eliminación
      del parche global (test de integración del evento) (AC4).

## Fase D — Corrección de los 3 P0

- [ ] T17: **P0-1 (caché stale)** — unificar `["reports"]` y
      `["shiftReports"]` en **una sola raíz canónica** del recurso
      (`useReportsQuery` + `useShiftReportsInfinite`); **las 4
      invalidaciones** apuntan a esa raíz: 3 en
      `src/hooks/useReportMutations.ts:11,18,25` **y 1 en
      `src/features/dashboard/hooks/useDashboardClockActions.ts:27`**
      (cierre de turno), que hoy invalida `["reports"]` y quedaría huérfana;
      test de regresión que verifica que tras `addReport` / `updateReport` /
      `deleteReport` la query de reportes cerrados refleja el cambio (hoy
      `features/logbook/components/ClosedReportsModal.tsx:43` muestra datos
      stale) (AC5).
- [ ] T18: **P0-2 (barra de carga)** — reescribir
      `src/hooks/useNavigationLoading.ts` para que se acople al estado real
      de las queries activas (`useIsFetching` / `useIsLoading` de TanStack Query)
      con un piso mínimo basado en la **duración real** de la query; eliminar
      el `setTimeout` fijo de 400 ms y su comentario de "simulación"
      (AC6).
- [ ] T19: **P0-3 (KPIs)** — migrar `src/hooks/useKpiCalculations.ts` de
      `useState` + fetch manual a `useQuery` con la raíz canónica
      `["kpis", "summary", filters]`, declarada en `PERSISTED_QUERY_ROOTS`.
      **No unificar con `useAttendanceAnalytics`**: verificado en código, no
      comparten endpoint (`POST /kpis/summary` en `kpiService.ts:20` vs
      `GET /time-records/daily-attendance` en `useAttendanceAnalytics.ts:48`);
      son recursos distintos (AC7).

## Fase E — Namespaces y guardrail

- [ ] T20: Crear `frontend/src/lib/queryKeys.ts` con la **tabla canónica** de
      raíces y constructores de clave (única fuente de verdad); reemplazar las
      ~50 claves literales distribuidas entre `src/hooks/queries/`,
      `src/hooks/use*Mutations.ts` y `src/features/*/hooks/` por referencias a
      la tabla (AC8).
- [ ] T21: Unificar `config` en **una sola forma de clave**
      (`config(key) => ["config", key]`), eliminando la coexistencia entre
      `["config", key]` y los sub-keys hardcodeados
      (`useConfigQuery.ts:9` vs `:19,27,37`) (AC8).
- [ ] T22: Canonicalizar las **dos** raíces en kebab-case:
      `["audit-logs", ...]` (`src/hooks/queries/useProactiveDetectionsQuery.ts:12`
      → `auditLogs`) **y** `["attendance-analytics", ...]`
      (`src/features/supervisor-dashboard/hooks/useAttendanceAnalytics.ts:44` →
      `attendanceAnalytics`); extender `PERSISTED_QUERY_ROOTS` /
      `SENSITIVE_QUERY_ROOTS` (`src/lib/queryCache.ts:33-60`) para que
      **toda** raíz usada en el código esté en una de las dos listas
      (allowlist positiva, sin blocklist). `auditLogs` queda en
      `SENSITIVE_QUERY_ROOTS` y `attendanceAnalytics` en
      `PERSISTED_QUERY_ROOTS` (agregado diario sin PII por empleado) (AC8).
- [ ] T23: Resolver la **invalidación huérfana de `["calendar"]`**: las 8
      invalidaciones de `useShiftMutations.ts:86`,
      `useLeaveMutations.ts:18,29` y `useHolidayMutations.ts:15,26,38,51,63`
      nunca alcanzan a `["calendarMatrix", ...]`
      (`useCalendarMatrixQuery.ts:9`) porque el match de TanStack es por
      prefijo exacto del array; unificar la raíz de la matriz de calendario
      en la tabla canónica y hacer que **sí** se invalide (AC8).
- [ ] T24: Crear `frontend/src/tests/guardrails/httpClientGuardrails.test.ts`
      con 2 invariantes: (a) **cero** `fetch(` / `XMLHttpRequest` / `axios`
      fuera de `src/services/apiClient.ts` (whitelist explícita y congelada:
      `apiClient.ts`, `hooks/useWeather.ts` — API externa Open-Meteo —,
      `components/ui/UserManualModal.tsx` — asset estático
      `/ManualRelojControl.md` — y los ficheros de test; presupuesto 0);
      (b) todo service que expone operaciones de red propaga error con
      `status` numérico; registrar el guardrail en `frontend/package.json`
      (`test:guardrails` y `lint:guardrails`) (AC9).
      **Gate de orden**: esta tarea **no se mergea antes que la spec 033**
      (T11 `DeveloperPanel` y T14 `ShiftHistoryModal`), que es quien elimina
      los 2 `fetch(` de componentes. La whitelist **no** los amortigua con
      una entrada temporal: el ratchet es 0, no "cero y bajando".
- [ ] T25: Test que verifica que **toda** raíz de query usada en el código
      está en `PERSISTED_QUERY_ROOTS` o `SENSITIVE_QUERY_ROOTS`; una raíz
      fuera de ambas listas falla el CI (AC8).

## Verificación final

- [ ] T26: Suite completa verde: `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` y `npm run e2e:staging` (56 tests, incluidos
      `smoke`, `user-flows`, `offline` y `kiosk`) (AC10).
- [ ] T27: Actualizar `.agents/rules/frontend-performance.md` con la
      invariante "toda llamada de red pasa por `apiClient`; prohibido `fetch`
      directo en `services/`, en hooks de feature y en componentes" y el
      docblock de `apiClient.ts` con el contrato del cliente único (AC10).
- [ ] T28: Promover `docs/adr/0024-frontend-http-client-consolidation.md` de
      "Propuesto" a "Aceptado" con las líneas de implementación verificadas;
      actualizar la tabla de `docs/adr/README.md` en el mismo commit; marcar
      el spec como "Implementado" (AC10).
