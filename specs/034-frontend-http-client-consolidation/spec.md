# Spec 034: Frontend HTTP Client Consolidation

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-21
- Cierre: 2026-10-21 (T1–T28, suite completa verde)
- ADR relacionado: [0024-frontend-http-client-consolidation.md](file:///docs/adr/0024-frontend-http-client-consolidation.md)
- Specs hermanos: [033-frontend-layering-hardening](file:///specs/033-frontend-layering-hardening/spec.md) (frontera de capas), [032-remote-state-consolidation](file:///specs/032-remote-state-consolidation/spec.md) (estado remoto)

## Problema

La auditoría del 2026-10-21 confirma que el frontend tiene **dos stacks de HTTP
en paralelo** y **tres bugs P0** derivados de esa duplicación.

1. **13 de 24 services usan `fetch` crudo** y evitan `apiClient`, que sí está
   endurecido:

   | Service                          | `fetch` | Líneas |
   | -------------------------------- | ------: | -----: |
   | `services/configService.ts`      |      10 |    194 |
   | `services/holidayService.ts`     |       8 |    136 |
   | `services/seedingService.ts`     |       7 |    167 |
   | `services/healthService.ts`      |       7 |    160 |
   | `services/emailService.ts`       |       7 |    148 |
   | `services/kpiService.ts`         |       6 |    207 |
   | `services/shiftReportService.ts` |       6 |    155 |
   | `services/authService.ts`        |       5 |    166 |
   | `services/auditLogService.ts`    |       5 |    124 |
   | `services/correctionService.ts`  |       5 |    116 |
   | `services/schedulingService.ts`  |       4 |    163 |
   | `services/exportService.ts`      |       2 |    132 |
   | `services/importService.ts`      |       1 |     42 |

   Solo 7 services usan el cliente endurecido (`employeeService`,
   `leaveService`, `meterService`, `noteService`, `shiftService`,
   `timeRecordService`, `userService`).

2. **Consecuencia crítica: los errores HTTP pierden el status numérico.**
   Los 13 services lanzan `new Error(\`Error ${response.status}: ...\`)`en vez
de`ApiHttpError` (`services/apiClient.ts:37-49`, que preserva `status`).
El guard global `hasHttpStatus`de`src/lib/queryClient.ts:23-31`**nunca
puede matchear** un status en estos 13 services → **un 403 (permiso) o un
404 (inexistente) se reintentan 2 veces** contra el backend antes de
reportarse como error. Un`403` reintentado 2 veces es 2 requests
   denegados de más por cada intento de usuario.

3. **Sin timeout, sin retry y sin dedup en el 54% de los services.** Un
   request colgado cuelga la UI indefinidamente; un 5xx transitorio se
   convierte en error duro; dos GET concurrentes idénticos se ejecutan dos
   veces.

4. **Dos políticas de 429 compitiendo.** _(resuelto en T3 + T15, Fase A)_
   `services/apiClient.ts:21,26` reintenta
   429 respetando `Retry-After`; `services/fetchGuards.ts` **monkey-patchea
   `window.fetch` globalmente** (instalado en `src/main.tsx:12`) y dispara un
   `CustomEvent("rate_limited")` que `src/store/useStore.ts:52-66` convierte en
   toast. Los dos mecanismos coexisten y los 13 services con `fetch` crudo
   heredan el patch global sin quererlo.

5. **Bug P0 — caché stale: `["shiftReports"]` nunca se invalida.**
   `src/hooks/useReportMutations.ts` invalida `["reports"]` en sus 4 sitios,
   pero `src/hooks/queries/useShiftReportsInfinite.ts:11` usa la raíz
   `["shiftReports", params]`. En TanStack, `invalidateQueries({queryKey:
["reports"]})` **no matchea** `["shiftReports"]` (el match es por prefijo
   exacto del array). Resultado: `features/logbook/components/ClosedReportsModal.tsx:43`
   muestra reportes cerrados **desactualizados** después de cualquier
   mutación.

6. **Bug P0 — la barra de carga miente.** `src/hooks/useNavigationLoading.ts`
   arranca el loading en cada cambio de ruta y lo detiene con un
   `setTimeout` **fijo de 400 ms**, con el comentario _"Simulamos un pequeño
   retraso para que la transición sea perceptible"_. No refleja la carga real
   de datos: una ruta lenta muestra la barra 400 ms y la oculta mientras la
   vista sigue vacía.

7. **Bug P0 — un fetch sin caché ni invalidación.**
   `src/hooks/useKpiCalculations.ts` (87 líneas) hace `useState` + `await
runKpiCalculation()` manual, **sin TanStack Query**, en paralelo a
   `src/features/supervisor-dashboard/hooks/useAttendanceAnalytics.ts` (166
   líneas) que sí usa `useQuery`. Dos caminos de datos para KPIs.

8. **Deriva de namespaces de query key.** Conviven camelCase
   (`shiftPatterns`, `assignedShifts`, `correctionRequests`, `calendarMatrix`),
   kebab-case (`audit-logs` en
   `src/hooks/queries/useProactiveDetectionsQuery.ts:12` y
   `attendance-analytics` en
   `src/features/supervisor-dashboard/hooks/useAttendanceAnalytics.ts:44`) y
   dos namespaces paralelos para `config`: `["config", key]` genérico
   (`src/hooks/queries/useConfigQuery.ts:9`) vs sub-keys hardcodeados
   (`["config","accounting_lock_date"]`, `useConfigQuery.ts:19,27,37`). Una
   invalidación genérica no alcanza a los sub-keys y viceversa. Las dos
   raíces kebab-case no están ni en `PERSISTED_QUERY_ROOTS` ni en
   `SENSITIVE_QUERY_ROOTS` (`src/lib/queryCache.ts:33-60`), así que escapan
   silenciosamente de ambas allowlists. A ello se suma una **invalidación
   huérfana**: `["calendar"]` (8 sitios) nunca alcanza a
   `["calendarMatrix", ...]`.

9. **Doble bucle de reintentos: hasta 9 requests HTTP por fallo.**
   _(resuelto en T5, Fase A)_ El cliente
   endurecido reintenta (`MAX_GET_RETRIES = 2` → 3 intentos,
   `apiClient.ts:20-21,310-341`) **y** TanStack Query también
   (`retry: (failureCount) => failureCount < 2` → 3 ejecuciones de `queryFn`,
   `src/lib/queryClient.ts:23-31`). Un GET que devuelve 500/503 dentro de un
   `useQuery` dispara **3 × 3 = 9** peticiones al backend por fallo. Además
   `hasHttpStatus` (`src/lib/queryClient.ts:6-10`) solo clasifica
   401/403/404: un **400, 409 o 422** sigue siendo reintentado.

10. **13 llamadas a `fetch(` fuera de `src/services/`**, o sea el presupuesto 0
    del guardrail (AC9) **no es cierto hoy**. Reparto real:

    | Ubicación                                                          | `fetch(` | ¿Cubierta por la spec 033?         |
    | ------------------------------------------------------------------ | -------: | :--------------------------------- |
    | `features/governance/hooks/useSystemMaintenanceController.ts`      |        8 | no (033 solo audita `components/`) |
    | `features/governance/hooks/useSecurityInsightsController.ts`       |        1 | no (033 solo audita `components/`) |
    | `features/configuration/components/DeveloperPanel.tsx:249`         |        1 | sí (`RAW_FETCH_BUDGET = 2`, T11)   |
    | `features/employee-management/components/ShiftHistoryModal.tsx:60` |        1 | sí (`RAW_FETCH_BUDGET = 2`, T14)   |
    | `hooks/useWeather.ts:107` (API externa Open-Meteo)                 |        1 | whitelist legítima                 |
    | `components/ui/UserManualModal.tsx:64` (`/ManualRelojControl.md`)  |        1 | whitelist legítima                 |

11. **El cliente endurecido no cubre el tráfico que hay que migrar.**
    _(resuelto en T2, Fase A)_
    `apiClient` hoy no soporta: (a) **respuestas binarias** — `handleResponse`
    (`apiClient.ts:360-384`) hace `response.text()` cuando el content-type no
    es JSON, **corrompiendo PDFs y XLSX**, y descarta el header
    `Content-Disposition` que usa `exportService.ts:61,110`; (b) **cuerpos
    `FormData`** — `apiClient.post` fuerza `Content-Type: application/json` y
    `JSON.stringify(body)` (`apiClient.ts:259-274`), lo que rompe
    `configService.ts:63,87` (`uploadBrandLogo`,
    `uploadCompanyPolicy`) e `importService.ts:12` (`previewImport`); y (c)
    **método `PATCH`**, requerido por `shiftReportService.ts:70` y
    `correctionService.ts:78`. Además `apiClient` dispara globalmente
    `unauthorized` ante cualquier 401 (`apiClient.ts:277-285`), lo que
    **rompe `authService`** si se migra sin supresión de eventos (ver punto 4
    del problema).

## Alcance

Dentro:

- **A. Cliente HTTP único**: migrar los 13 services con `fetch` crudo a
  `apiClient`, conservando sus firmas públicas (sin cambios para los
  consumidores) y su tipado contra `src/types/api`. Incluye **ampliar el
  cliente** con lo que la migración exige: `patch()`, cuerpos `FormData`
  (sin `Content-Type` manual, para que el navegador fije el `boundary`) y un
  **modo de respuesta binaria** que devuelve `{ blob, headers, filename? }`.
  Incluye además migrar los **9 `fetch(` de los hooks de governance**
  (`useSystemMaintenanceController.ts`, `useSecurityInsightsController.ts`)
  hacia `healthService` / `apiClient`, para que el presupuesto 0 del
  guardrail sea alcanzable (ver punto 10 del problema).
- **B. Política de red única**: un único lugar que decide timeout, retry,
  dedup, status de error y tratamiento de 429; eliminar el monkey-patch de
  `window.fetch` de `fetchGuards.ts` y su instalación en `main.tsx`, dejando
  el evento `rate_limited` emitido desde el cliente (no desde un parche
  global). **El dueño único del retry de transporte es `apiClient`**; TanStack
  Query deja de reintentar por su cuenta (ver AC2).
- **C. Corrección de los 3 P0**: unificar la invalidación de
  `["shiftReports"]`/`["reports"]`, reemplazar el timer fijo de
  `useNavigationLoading` por el estado real de carga, y llevar
  `useKpiCalculations` a TanStack Query.
- **D. Namespaces de query key**: una sola raíz canónica por recurso
  (camelCase), una sola forma de construir la clave de `config`, y las
  allowlists de `src/lib/queryCache.ts` (**allowlist positiva**) covering
  todas las raíces existentes.
- **E. Guardrail**: `frontend/src/tests/guardrails/httpClientGuardrails.test.ts`
  que bloquee `fetch(` y `XMLHttpRequest` fuera de `src/services/apiClient.ts`
  (y de los ficheros de test), y que verifique que **todo** service exponga
  errores con status numérico. La whitelist es **explícita y congelada**
  (ver AC9).

Fuera (explícito):

- **Los 2 `fetch(` de componentes que la spec 033 ya cubre**
  (`DeveloperPanel.tsx:249`, `ShiftHistoryModal.tsx:60`): los extrae la spec
  033 a hooks de dominio (T11 y T14). La spec 034 **no** los duplica, pero
  su guardrail (AC9) **no puede aterrizar antes que ellos**: ver
  "Dependencias de orden" en Restricciones.
- **El rediseño del flujo de descarga**: la migración de los 6 métodos
  `download*` cambia su **tipo de retorno** (excepción explícita a AC1, ver
  AC1 y Restricciones), pero el comportamiento visible se preserva: el
  `Content-Disposition` se sigue leyendo, el nombre de archivo no cambia y no
  se rediseña ninguna pantalla de exportación.
- **Caché de respuesta en el cliente** (HTTP caching, ETag, `stale-while-revalidate`
  de red): el modelo actual es TanStack Query con `staleTime`; esta spec no
  introduce una segunda capa de caché.
- **Reintentos de mutaciones**: la política de retry sigue siendo GET-only
  (idempotencia); las mutaciones no se reintentan automáticamente.
- **Normalización de payloads de respuesta**: el _shaping_ que hoy vive en
  `kpiService.ts:58-70` y en los DTOs inline de `schedulingService.ts:7-39`
  se migra a los tipos de `src/types/`, pero **no** se rediseña el contrato
  HTTP ni se toca `swagger.json`.
- Backend, rutas HTTP, esquemas Prisma, `swagger.json` o SDK: el spec es de
  frontend puro.
- Specs hermanos: la frontera de capas de la UI es la
  [spec 033](file:///specs/033-frontend-layering-hardening/spec.md); el stack
  de pruebas es la [spec 035](file:///specs/035-frontend-testing-stack/spec.md).

## Criterios de aceptación

- [ ] AC1: **`apiClient` es el único cliente HTTP**. Los 13 services migrados
      (`configService`, `holidayService`, `seedingService`, `healthService`,
      `emailService`, `kpiService`, `shiftReportService`, `authService`,
      `auditLogService`, `correctionService`, `schedulingService`,
      `exportService`, `importService`) no contienen ninguna llamada a `fetch(`;
      sus **firmas públicas y sus tipos de retorno no cambian**, de modo que
      sus consumidores (hooks de query y de mutación) no requieren
      modificaciones.
      **Excepción explícita y acotada (6 métodos `download*`)**: al extraerse
      los side-effects de DOM (T8), `downloadReportPDF` / `downloadReportExcel`
      (`kpiService.ts:129,169`), `downloadShiftReportPDF` /
      `downloadShiftReportExcel` (`shiftReportService.ts:105,132`) y
      `downloadCalendarPDF` / `downloadEmployeesExcel` (`exportService.ts:10,87`)
      **sí cambian su tipo de retorno** a
      `Promise<{ blob: Blob; filename: string }>` (hoy `Promise<void>` o
      `Promise<boolean>`): el service transporta el binario y **no** crea el
      `<a>`. El consumidor final (hook de feature) invoca
      `triggerBrowserDownload(blob, filename)` (helper nuevo en `src/utils/`),
      que preserva el `Content-Disposition` que hoy leen
      `exportService.ts:61,110`. Los **parámetros de entrada** de esos 6
      métodos no cambian.
      **El cliente debe cubrir el tráfico migrado**: `apiClient` expone
      `patch()`, acepta cuerpos `FormData` **omitiendo** el header
      `Content-Type` (para que el navegador fije el `boundary`) y ofrece un
      **modo de respuesta binaria** que devuelve `{ blob, headers, filename? }`
      sin pasar por `response.text()` (que corrompería PDF/XLSX).
- [ ] AC2: **Todo error de API expone status numérico y el retry tiene un
      único dueño**. Cada service propaga `ApiHttpError` (o un tipo que
      exponga `status: number`), de modo que el clasificador de status de
      `src/lib/queryClient.ts` puede distinguir 401 / 403 / 404 / 409 / 429.
      **Dueño único del retry: `apiClient`** (ya tiene backoff, respeta
      `Retry-After` y deduplica). TanStack Query **deja de reintentar por su
      cuenta**: `queries.retry` pasa a `false` en `src/lib/queryClient.ts`, con
      lo que un GET con 500/503 dentro de un `useQuery` pasa de **9** a **3**
      peticiones HTTP (3 intentos de `apiClient` × 1 ejecución de `queryFn`).
      El clasificador de status de `queryClient.ts` se corrige para bloquear
      **todo 4xx no transitorio**:
      `status >= 400 && status < 500 && status !== 408 && status !== 429`
      (es decir, 400, 401, 403, 404, 409, 422 y demás 4xx definitivos), de
      modo que ni un override puntual de `retry` reintente un 400/409/422.
      **Los overrides por query que contradicen la política se eliminan**:
      `SUPERVISOR_DASHBOARD_CONFIG`
      (`features/supervisor-dashboard/config/performance.ts:14,22,30` —
      `retry: 1`, `retry: 2`, `retry: 3`) sobrevivirían al default `false` y
      reintroducirían el doble bucle justo en las queries más pesadas del
      dashboard de supervisor. Los `retry: false` redundantes
      (`useReportsQuery.ts:22`, `useHealthQuery.ts:78,86`,
      `useLeavesQuery.ts:17`, `useConfigQuery.ts:92`) también se eliminan:
      la política vive en un solo sitio.
      **Test de regresión**: un 403 y un 404 **no** se reintentan; un 400, un
      409 y un 422 **tampoco**; un 500 y un 503 sí se reintentan (GET, hasta 2
      veces, con backoff y respetando `Retry-After`); y el número total de
      peticiones HTTP por fallo **nunca excede 3**.
- [ ] AC3: **Timeout, retry y dedup uniformes**. Todas las llamadas pasan por
      el cliente endurecido y por tanto tienen timeout por defecto (15 s,
      `AbortSignal.timeout`, componible con la señal del llamante), retry
      GET-only con backoff exponencial, y dedup de GET en vuelo por
      (método, URL, auth). Un request colgado aborta en lugar de colgar la UI.
- [ ] AC4: **Una sola política de 429, sin eventos globales espurios**. El
      evento `rate_limited` se emite desde `apiClient` (no desde un parche de
      `window.fetch`); `src/services/fetchGuards.ts` se elimina y
      `src/main.tsx` deja de llamar `installFetchGuards()`; el toast de
      `src/store/useStore.ts:52-66` se sigue mostrando. **No hay dos
      mecanismos compitiendo por el mismo status.**
      **Supresión en endpoints de autenticación anónima**: `apiClient` NO
      dispara `rate_limited` ni `unauthorized` en `/auth/login`,
      `/auth/mfa/validate` y `/auth/kiosk-login` (mecanismo: opción explícita
      `skipAuthEvents?: boolean` en `RequestOptions`, aplicada por defecto a
      ese conjunto de endpoints). Preserva la exclusión que hoy hace
      `fetchGuards.ts:25` (`/\/auth\/login(?:\?|$)/`) y **evita la regresión**
      de migrar `authService`: hoy un 401 por contraseña, PIN o código MFA
      incorrecto **no** dispara `unauthorized` (porque `authService` usa
      `fetch` crudo), y con el cliente endurecido dispararía
      `window.dispatchEvent(new CustomEvent("unauthorized"))`
      (`apiClient.ts:277-285`), lo que limpiaría la sesión
      (`src/store/useStore.ts:47-49`, `src/App.tsx:123`) en lugar de tratarse
      como credencial inválida. `/auth/mfa/setup` y `/auth/mfa/verify` **sí**
      conservan el evento `unauthorized` (exigen sesión previa: un 401 ahí sí
      es expiración de sesión).
- [ ] AC5: **El P0 de caché stale está corregido**. `["shiftReports"]` y
      `["reports"]` quedan unificados en **una sola raíz canónica**; **las 4
      invalidaciones** de la raíz de reportes apuntan a ella: 3 en
      `src/hooks/useReportMutations.ts:11,18,25` (`addReport` / `updateReport`
      / `deleteReport`) **y 1 en `src/features/dashboard/hooks/useDashboardClockActions.ts:27`**
      (cierre de turno), que hoy invalida `["reports"]` y quedaría huérfana.
      Un test verifica que, tras `addReport` / `updateReport` / `deleteReport`,
      la query de reportes cerrados refleja el cambio (hoy
      `ClosedReportsModal.tsx:43` muestra datos stale).
- [ ] AC6: **La barra de carga refleja la carga real**.
      `src/hooks/useNavigationLoading.ts` deja de usar el `setTimeout` fijo de
      400 ms y se acopla al estado real de las queries activas de TanStack
      Query (`isFetching`/`isLoading` del `QueryClient`), con un piso mínimo
      **no** Observable (evita el parpadeo de 1 frame) y sin timer de mentira.
- [ ] AC7: **KPIs por un solo camino**. `src/hooks/useKpiCalculations.ts`
      deja de hacer fetch manual y se apoya en TanStack Query (con
      `queryKey` canónica); no queda fetch manual en el hook. La raíz
      canónica es `["kpis", "summary", filters]`, declarada en
      `PERSISTED_QUERY_ROOTS`. **No se unifica con `useAttendanceAnalytics`**:
      los dos hooks **no** comparten endpoint —`useKpiCalculations` invoca
      `POST /kpis/summary` (`kpiService.ts:20`, vía `runKpiCalculation`) y
      `useAttendanceAnalytics` invoca `GET /time-records/daily-attendance`
      (`useAttendanceAnalytics.ts:48`)—; son recursos distintos y cada uno
      conserva su endpoint. El `queryClient.invalidateQueries` que hoy se hace
      en `features/governance/components/IntegritySummaryView.tsx:52` **no** se
      toca aquí (pertenece a la spec 033).
- [ ] AC8: **Namespaces de query key canónicos**. Existe una única raíz por
      recurso, toda en camelCase; `["audit-logs", ...]` pasa a
      `["auditLogs", ...]` (o queda explícitamente en una allowlist con
      justificación); **también** `["attendance-analytics", ...]`
      (`useAttendanceAnalytics.ts:44`) pasa a `["attendanceAnalytics", ...]`:
      es la **segunda** raíz en kebab-case fuera de ambas allowlists y hoy
      escapa de `PERSISTED_QUERY_ROOTS` / `SENSITIVE_QUERY_ROOTS`. Ambas
      quedan **declaradas** (`auditLogs` en `SENSITIVE_QUERY_ROOTS`;
      `attendanceAnalytics` en `PERSISTED_QUERY_ROOTS`: es un agregado diario
      sin PII por empleado, como `timeRecords`).
      `config` usa **una sola** forma de clave (genérica `["config", key]` o
      sub-key hardcodeado, no ambos), de modo que una invalidación genérica
      alcanza a todo el recurso; **toda** raíz usada en el código está en
      `PERSISTED_QUERY_ROOTS` o en `SENSITIVE_QUERY_ROOTS` de
      `src/lib/queryCache.ts` — el guardrail falla si aparece una raíz
      fuera de ambas listas.
      **Invalidaciones huérfanas**: la tabla canónica elimina las raíces que
      se invalidan pero que no existen como query. Hoy hay dos: `["reports"]`
      (resuelta en AC5) y `["calendar"]` —8 invalidaciones en
      `useShiftMutations.ts:86`, `useLeaveMutations.ts:18,29` y
      `useHolidayMutations.ts:15,26,38,51,63`— que **nunca** alcanzan a
      `["calendarMatrix", ...]` (`useCalendarMatrixQuery.ts:9`), porque el
      match de TanStack es por prefijo exacto del array. La raíz de la
      matriz de calendario queda unificada y **sí** invalidada por las
      mutaciones de turnos, permisos y festivos.
- [ ] AC9: **Guardrail del cliente HTTP único**. Nuevo
      `frontend/src/tests/guardrails/httpClientGuardrails.test.ts` que bloquea
      `fetch(` / `XMLHttpRequest` / `axios` fuera de
      `src/services/apiClient.ts`, y que verifica que **todo** service que
      exporta operaciones de red expone errores con status. Se registra en
      `test:guardrails` y `lint:guardrails`.
      **Whitelist explícita y congelada** (presupuesto 0 fuera de ella):
      (a) `frontend/src/services/apiClient.ts` — el único emisor de red;
      (b) `frontend/src/hooks/useWeather.ts` — API **externa** (Open-Meteo),
      no es el backend de la aplicación;
      (c) `frontend/src/components/ui/UserManualModal.tsx` — descarga de un
      asset estático versionado (`/ManualRelojControl.md`), no es una llamada
      a la API;
      (d) los ficheros de test (`**/*.test.ts`, `**/*.test.tsx`).
      **Los 2 `fetch(` de componentes (`DeveloperPanel.tsx:249`,
      `ShiftHistoryModal.tsx:60`) NO entran en la whitelist**: los extrae la
      spec 033 (T11 y T14) y su eliminación es **precondición** de este
      guardrail (ver "Dependencias de orden" en Restricciones).
- [ ] AC10: **Sin regresión funcional**. `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` en verde y `npm run e2e:staging` en verde (56 tests),
      incluyendo los flujos de **login** (`authService` migrado),
      **offline** (`useKpiCalculations` + `syncSlice` intactos) y **kiosk**
      (`healthService` / `configService` migrados).

## Restricciones

- Constitución (I–V): en particular III ("seguridad fail-fast") — la
  migración no puede introducir fallbacks débiles; y IV ("calidad con
  ratchet") — el guardrail nuevo es un ratchet en 0 desde el primer día.
- **Los 13 services migrados conservan su API pública**: no cambia la firma,
  ni el tipo de retorno, ni los nombres de los métodos. Cualquier cambio de
  contrato HTTP require regenerar `swagger.json` y el SDK, lo que queda
  fuera de alcance.
  **Única excepción, acotada a 6 métodos**: los `download*` de `kpiService`,
  `shiftReportService` y `exportService` cambian su **tipo de retorno** a
  `Promise<{ blob: Blob; filename: string }>` porque el service deja de crear
  el `<a>` y de hacer `.click()` (T8). Sus **parámetros de entrada** no
  cambian, y el consumidor (hook de feature) conserva el comportamiento
  visible mediante `triggerBrowserDownload(blob, filename)`.
- **`authService` conserva su contrato de error**: `login` sigue lanzando un
  error con el mensaje del backend (`data.message`), y `kioskVerifyPin` sigue
  **devolviendo** `{ success: false, message }` en lugar de lanzar. Migrarlo
  no puede convertir un "PIN incorrecto" en un "401 que cierra la sesión"
  (ver AC4).
- **La cola de escritura offline (`syncSlice`) no se toca**: la migración es
  de transporte, no de estrategia de sincronización.
- El evento `rate_limited` conserva su nombre, su payload
  (`{status, url, retryAfter}`) y su consumidor (el toast de `useStore`), para
  no romper el contrato con `src/store/useStore.ts:52-66`.
- El timeout por defecto (15 s) es el mismo que ya usa `apiClient`; cambiarlo
  requiere justificación en el PR.
- Rollback por fase: cada workstream (A–E) es un PR independiente.

### Dependencias de orden

- **Spec 033 → Spec 034 (guardrail)**: el guardrail de AC9/T24 exige
  presupuesto 0 de `fetch(` fuera de la whitelist. Los 2 `fetch(` de
  componentes (`DeveloperPanel.tsx:249`, `ShiftHistoryModal.tsx:60`) los
  elimina la spec 033 (T11 y T14), que los extrae a hooks de dominio. Por
  tanto **T24 no se mergea antes que la spec 033**: si 033 se retrasa, 034
  retrasa el guardrail con ella. La whitelist **no** los amortigua con una
  entrada temporal (el ratchet es 0, no "cero y bajando").
- **Spec 034 → Spec 033 (sin acoplamiento)**: la spec 034 no toca
  `IntegritySummaryView.tsx:52` ni los componentes que 033 parte; los 9
  `fetch(` de los hooks de governance (`features/governance/hooks/`) **no**
  están cubiertos por 033 (su alcance de escaneo es
  `features/**/components/**`), así que los migra 034 en el Lote 3.

## Trazabilidad

- **Tests que lo probarán**:
  - `frontend/src/tests/guardrails/httpClientGuardrails.test.ts` (nuevo, AC9)
  - `frontend/src/services/apiClient.spec.ts` (extender: 403/404/400/409/422
    **no** reintentan, 500/503 sí, timeout, dedup, evento 429, supresión de
    `rate_limited` y `unauthorized` en endpoints anónimos, respuesta binaria
    sin corrupción, cuerpo `FormData` sin `Content-Type` manual, `patch()`,
    AC2–AC4)
  - `frontend/src/lib/queryClient.spec.ts` (nuevo: `queries.retry === false` y
    el clasificador de 4xx no transitorio, AC2)
  - `frontend/src/tests/state/` (tests de caché/query: AC5, AC8)
  - `frontend/src/hooks/useKpiCalculations.test.ts` (nuevo, AC7)
  - `frontend/e2e/{smoke,user-flows,offline,performance}.spec.ts` (AC10)
- **Docs a actualizar**:
  - `frontend/src/services/README.md` (o el docblock de `apiClient.ts`): el
    contrato del cliente único
  - `.agents/rules/frontend-performance.md` (invariante nueva: "toda llamada
    de red pasa por `apiClient`; prohibido `fetch` directo en services")
  - `docs/adr/0024-frontend-http-client-consolidation.md`
  - `docs/adr/README.md` (índice)
