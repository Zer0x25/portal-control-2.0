# Plan 034: Frontend HTTP Client Consolidation

Spec: `./spec.md`. Constitución: `../constitution.md`.
Hermanos: `../033-frontend-layering-hardening/plan.md` (frontera de capas),
`../035-frontend-testing-stack/plan.md` (stack de pruebas).

## Estrategia

5 workstreams secuenciales (A→E). El orden es **del más riesgoso al menos
riesgoso en términos de superficie**: primero se consolida el cliente sobre
los services con menos consumidores, y el último PR migra `authService`, que
es el service más sensible (login, MFA, sesión) y cuyo flujo tiene e2e
dedicado.

1. **Fase A — Fundaciones del cliente (PR 1)**:
   - Consolidar en `src/services/apiClient.ts` todo lo que hoy está
     disperso: timeout, retry GET-only con backoff y `Retry-After`, dedup de
     GET en vuelo, `ApiHttpError` con `status` numérico, y la **emisión del
     evento `rate_limited`** (hoy en `fetchGuards.ts:27-38`).
   - `apiClient` debe admitir dos modos de error: **lanza** `ApiHttpError`
     (comportamiento actual) y **devuelve** un resultado tipado con `status`
     para los endpoints donde el 404 es un caso de negocio legítimo (p. ej.
     `GET /brand-logo` sin logo configurado → `configService`).
   - Añadir a `apiClient` un helper `request<T>()` con **tipado contra
     `src/types/api`** (`paths[P]` / `components["schemas"]`), de modo que la
     migración no pierda el tipado contra `swagger.json` que ya tienen los 7
     services migrados.
   - **Capacidades que la migración exige y hoy faltan** (AC1):
     (a) `patch()` — lo piden `shiftReportService.ts:70` y
     `correctionService.ts:78`;
     (b) **cuerpo `FormData`** — si el body es `FormData`, el cliente **omite**
     el header `Content-Type` para que el navegador fije el `boundary` de
     `multipart/form-data` (lo piden `configService.ts:63,87` e
     `importService.ts:12`); hoy `post` fuerza `application/json` +
     `JSON.stringify(body)` y los corrompe;
     (c) **modo de respuesta binaria** — devuelve `{ blob, headers, filename? }`
     y **no** pasa por `response.text()` (que corrompe PDF/XLSX); el
     `filename` se deriva del header `Content-Disposition`, que hoy leen
     `exportService.ts:61,110` y que el cliente actual descarta.
   - **Dueño único del retry (decisión de la Fase A)**: el retry de
     transporte vive **solo** en `apiClient` (ya tiene backoff exponencial,
     respeta `Retry-After` y deduplica). `src/lib/queryClient.ts` pasa a
     `queries.retry: false`, de modo que un GET con 500/503 deja de generar
     **9** peticiones (3 intentos de `apiClient` × 3 ejecuciones de
     `queryFn`) y genera **3**. El clasificador de status de `queryClient.ts`
     se corrige a `status >= 400 && status < 500 && status !== 408 && status !== 429`,
     de modo que un 400/409/422 jams se reintenta aunque algún query haga
     override de `retry`.
   - **Los overrides por query se eliminan** (si no, el default `false` no
     basta): `SUPERVISOR_DASHBOARD_CONFIG`
     (`features/supervisor-dashboard/config/performance.ts:14,22,30` —
     `retry: 1`, `retry: 2`, `retry: 3`) reintroducirían el doble bucle en
     las queries más pesadas del dashboard de supervisor. También se
     limpian los `retry: false` redundantes de `useReportsQuery.ts:22`,
     `useHealthQuery.ts:78,86`, `useLeavesQuery.ts:17` y
     `useConfigQuery.ts:92`, para que la política viva en un solo sitio.
   - **Supresión de eventos globales en endpoints anónimos (Fase A)**:
     `RequestOptions` gana `skipAuthEvents?: boolean` (por defecto `false`) y
     `apiClient` lo aplica **automáticamente** al conjunto de endpoints de
     autenticación anónima `/auth/login`, `/auth/mfa/validate` y
     `/auth/kiosk-login`: en ellos no se emite `rate_limited` **ni**
     `unauthorized`. Preserva la exclusión de `fetchGuards.ts:25` y evita la
     regresión de que un 401 por credencial incorrecta cierre la sesión.
   - Decisión de diseño: **no** se introduce un segundo cliente. Se amplía el
     existente.
2. **Fase B — Migración de services por lotes (5 PR, orden por riesgo)**:
   - Lote 1 (riesgo bajo, pocos consumidores): `importService` (1 fetch),
     `exportService` (2), `correctionService` (5), `auditLogService` (5).
   - Lote 2: `schedulingService` (4), `shiftReportService` (6), `kpiService` (6).
   - Lote 3: `emailService` (7), `healthService` (7), `seedingService` (7)
     **+ los 9 `fetch(` de los hooks de governance**
     (`features/governance/hooks/useSystemMaintenanceController.ts` — 8
     llamadas a `/admin/*` y `/maintenance/clear-database` — y
     `features/governance/hooks/useSecurityInsightsController.ts` — 1 llamada a
     `/admin/security-insights`), que se mueven a `healthService` /
     `apiClient`. No los cubre la spec 033 (su alcance de escaneo es
     `features/**/components/**`) y son los que impiden que el guardrail de
     AC9/T24 tenga presupuesto 0.
   - Lote 4: `holidayService` (8), `configService` (10).
   - **Último PR, aparte**: `authService` (5) — login, MFA, PIN y expiración de
     sesión; requiere e2e específico (smoke + user-flows + kiosk) y revisión
     manual de la matriz de errores (401 vs 403 vs 429).
   - En cada lote: **las firmas públicas no cambian** (salvo la excepción
     acotada de los 6 `download*`, ver abajo). Solo se sustituye el
     transporte. Los DTOs inline que hoy viven en los services
     (`schedulingService.ts:7-39`) se mueven a `src/types/` en el mismo PR.
   - Los side-effects de DOM que hoy viven en los services
     (`kpiService.ts:154-162,194-202`, `exportService.ts`,
     `shiftReportService.ts` — `document.createElement` + `URL.createObjectURL`)
     **se extraen a los hooks de feature**: un service que descarga un blob no
     debe crear un `<a>` ni hacer `.click()`. Es la misma frontera que
     aplica la spec 033 a los componentes.
   - **Consecuencia asumida**: los 6 métodos `download*` cambian su tipo de
     retorno a `Promise<{ blob: Blob; filename: string }>` (excepción acotada a
     AC1). El helper `triggerBrowserDownload(blob, filename)` (nuevo, en
     `src/utils/`) conserva el comportamiento visible, incluida la variante
     `action: "print"` de `exportService.downloadCalendarPDF`, que pasa a
     `window.open` con un object URL en el hook.
3. **Fase C — Política de red única (PR)**:
   - **Ejecutada dentro del PR de la Fase A** (T15 y T16 adelantadas): emitir
     `rate_limited` desde el cliente mientras el parche global siguiera
     instalado habría duplicado el evento (dos mecanismos compitiendo por el
     mismo status, que es justo lo que AC4 prohíbe). El parche y su instalación
     desaparecen del mismo cambio que introduce al emisor único.
   - Eliminar `src/services/fetchGuards.ts` y su instalación en
     `src/main.tsx:12`.
   - Emitir `rate_limited` desde `apiClient`, conservando payload y consumidor
     (`src/store/useStore.ts:52-66`). El evento se emite **una sola vez por
     respuesta**, con el mismo lock de 5 s para no generar tormentas.
   - Verificar que `apiClient` ya reintentaba 429 con `Retry-After`
     (`apiClient.ts:21,26,292-307`): con `fetchGuards` eliminado, la política
     queda en un solo sitio. Decisión a confirmar en el PR: si el evento de
     toast y el retry compiten, el toast se emite en el **primer** 429 y el
     retry respeta `Retry-After` sin re-emitir el evento.
4. **Fase D — Corrección de los 3 P0 (3 PR)**:
   - **P0-1 (caché stale)**: unificar `["reports"]` y `["shiftReports"]` en una
     sola raíz canónica. Dado que `useReportsQuery` (5 usos) y
     `useShiftReportsInfinite` (1 uso) conviven para el mismo recurso
     (`shiftReportService.getAll`), la decisión es **una sola raíz** para el
     recurso, con la variante `infinite` como parámetro de la misma clave
     (p. ej. `["shiftReports", {pageSize, status}]`), de modo que una
     invalidación por prefijo `["shiftReports"]` alcanza a ambas variantes.
     Test de regresión sobre la mutación.
     **Las 4 invalidaciones** de la raíz de reportes pasan a la raíz
     canónica: 3 en `useReportMutations.ts:11,18,25` y **1 en
     `useDashboardClockActions.ts:27`** (cierre de turno), que hoy queda
     huérfana al invalidar `["reports"]`.
   - **P0-2 (barra de carga)**: `useNavigationLoading` se acopla al estado real
     de las queries. Opciones evaluadas en el PR: (a) `useIsFetching()` /
     `useIsLoading()` de TanStack Query (reactivo, sin polling);
     (b) contador manual de queries en vuelo (más control, más plumbing).
     Se elige (a) por simplicidad, con un piso mínimo de ~120 ms solo para
     evitar el parpadeo de 1 frame — **no** un timer que simule carga.
   - **P0-3 (KPIs)**: `useKpiCalculations` pasa de `useState` + fetch manual a
     `useQuery` con la raíz canónica `["kpis", "summary", filters]`.
     **No se unifica con `useAttendanceAnalytics`**: verificado en código, los
     dos hooks **no** comparten endpoint —`useKpiCalculations` invoca
     `POST /kpis/summary` (`kpiService.ts:20`) y `useAttendanceAnalytics`
     invoca `GET /time-records/daily-attendance` (`useAttendanceAnalytics.ts:48`)—
     son recursos distintos. La raíz `kpis` se declara en
     `PERSISTED_QUERY_ROOTS`.
5. **Fase E — Namespaces y guardrail (2 PR)**:
   - Canonicalizar las raíces: una tabla `QUERY_KEYS` en `src/lib/queryKeys.ts`
     que es la **única** fuente de verdad (hoy las claves están escritas a
     mano en ~50 sitios, distributed entre `hooks/queries/`, `hooks/use*Mutations.ts`
     y `features/*/hooks/`). Cada raíz se declara una vez y se referencia por
     constante → **elimina de raíz** la deriva camelCase/kebab-case y la
     duplicación `["config", key]` vs `["config","sub"]`.
   - Raíces kebab-case a canonicalizar: `["audit-logs", ...]`
     (`useProactiveDetectionsQuery.ts:12` → `auditLogs`) **y**
     `["attendance-analytics", ...]` (`useAttendanceAnalytics.ts:44` →
     `attendanceAnalytics`): la segunda no está en AC8/T22 del borrador
     original y hoy escapa de ambas allowlists.
   - **Invalidaciones huérfanas**: `["calendar"]` (8 invalidaciones en
     `useShiftMutations.ts:86`, `useLeaveMutations.ts:18,29` y
     `useHolidayMutations.ts:15,26,38,51,63`) nunca alcanza a
     `["calendarMatrix", ...]` (`useCalendarMatrixQuery.ts:9`), porque el match
     de TanStack es por prefijo exacto del array. La tabla canónica
     unifica la raíz de la matriz de calendario y la hace invalidable de
     verdad.
   - `config`: una sola forma de clave. La tabla declara `config: (key) =>
["config", key]` y todas las sub-claves hardcodeadas pasan a usar esa
     función.
   - Extender `src/lib/queryCache.ts` con un **test** que verifique que toda
     raíz usada en el código está en `PERSISTED_QUERY_ROOTS` o en
     `SENSITIVE_QUERY_ROOTS`. La allowlist sigue siendo **positiva**: una
     raíz nueva no se persiste hasta que se declare.
   - Guardrail nuevo `httpClientGuardrails.test.ts` con 2 invariantes:
     (a) **cero `fetch(`/`XMLHttpRequest`/`axios` fuera de `apiClient.ts`**
     (whitelist explícita y congelada, con presupuesto 0 desde el primer día
     porque la migración de la Fase B lo deja en 0); (b) **todo service que
     exponga operaciones de red propaga error con `status`**.
   - **Whitelist congelada del guardrail**: `apiClient.ts` (emisor único),
     `hooks/useWeather.ts` (API externa Open-Meteo),
     `components/ui/UserManualModal.tsx` (asset estático
     `/ManualRelojControl.md`) y los ficheros de test. Los 2 `fetch(` de
     `DeveloperPanel.tsx:249` y `ShiftHistoryModal.tsx:60` **no** entran: los
     elimina la spec 033 (T11 y T14) y **T24 no se mergea antes que ella**.

## Archivos a tocar

| Archivo                                                                                                                                   | Cambio                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/services/apiClient.ts`                                                                                                      | timeout/retry/dedup/status unificados + `rate_limited` + `request<T>()` + `patch()` + `FormData` + modo binario + `skipAuthEvents` |
| `frontend/src/services/fetchGuards.ts`                                                                                                    | **eliminar**                                                                                                                       |
| `frontend/src/main.tsx`                                                                                                                   | quitar `installFetchGuards()`                                                                                                      |
| `frontend/src/store/useStore.ts`                                                                                                          | conservar el consumidor de `rate_limited` (sin cambios de contrato)                                                                |
| `frontend/src/services/{config,holiday,seeding,health,email,kpi,shiftReport,auth,auditLog,correction,scheduling,export,import}Service.ts` | migrar a `apiClient` (firma intacta salvo los 6 `download*`)                                                                       |
| `frontend/src/features/governance/hooks/useSystemMaintenanceController.ts`                                                                | los 8 `fetch(` salen a `healthService` / `apiClient`                                                                               |
| `frontend/src/features/governance/hooks/useSecurityInsightsController.ts`                                                                 | el `fetch(` sale a `healthService` / `apiClient`                                                                                   |
| `frontend/src/utils/triggerBrowserDownload.ts`                                                                                            | **nuevo** — `triggerBrowserDownload(blob, filename)`                                                                               |
| `frontend/src/lib/queryKeys.ts`                                                                                                           | **nuevo** — tabla canónica de raíces y constructores de clave                                                                      |
| `frontend/src/lib/queryCache.ts`                                                                                                          | allowlists alineadas con la tabla canónica                                                                                         |
| `frontend/src/lib/queryClient.ts`                                                                                                         | `queries.retry: false` (dueño único del retry en `apiClient`) + clasificador de 4xx no transitorio                                 |
| `frontend/src/lib/queryClient.spec.ts`                                                                                                    | **nuevo** — dueño único del retry y clasificación de status                                                                        |
| `frontend/src/hooks/useReportMutations.ts`                                                                                                | invalidar la raíz canónica del recurso                                                                                             |
| `frontend/src/features/dashboard/hooks/useDashboardClockActions.ts`                                                                       | invalidar la raíz canónica del recurso (5.ª invalidación)                                                                          |
| `frontend/src/hooks/queries/useReportsQuery.ts`, `useShiftReportsInfinite.ts`                                                             | una sola raíz                                                                                                                      |
| `frontend/src/hooks/useNavigationLoading.ts`                                                                                              | acoplar al estado real de las queries (fin del timer de 400 ms)                                                                    |
| `frontend/src/hooks/useKpiCalculations.ts`                                                                                                | migrar a TanStack Query (fin del fetch manual)                                                                                     |
| `frontend/src/hooks/queries/*.ts`, `src/hooks/use*Mutations.ts`, `src/features/*/hooks/*.ts`                                              | usar `QUERY_KEYS` en lugar de claves literales (~50 sitios)                                                                        |
| `frontend/src/types/*.ts`                                                                                                                 | mover los DTOs inline de `schedulingService.ts:7-39`                                                                               |
| `frontend/src/tests/guardrails/httpClientGuardrails.test.ts`                                                                              | **nuevo**                                                                                                                          |
| `frontend/package.json`                                                                                                                   | registrar el guardrail en `test:guardrails` y `lint:guardrails`                                                                    |
| `frontend/src/services/apiClient.spec.ts`                                                                                                 | extender: status, 403/404 sin retry, 500/503 con retry, timeout, dedup, 429                                                        |
| `.agents/rules/frontend-performance.md`                                                                                                   | invariante "toda llamada de red pasa por `apiClient`"                                                                              |
| `docs/adr/0024-frontend-http-client-consolidation.md`                                                                                     | decisión permanente                                                                                                                |

## Contratos afectados

- **Backend / `swagger.json` / SDK: ninguno.** El spec es de frontend puro;
  los endpoints, sus params y sus respuestas no cambian. Solo cambia el
  transporte del cliente. `npm run check:sdk` no aplica.
- **Contrato interno de `apiClient`**: cambia (se le añade `request<T>()`, la
  emisión de `rate_limited`, un modo de error no-launching, `patch()`, el
  soporte de cuerpo `FormData`, el modo de respuesta binaria y la opción
  `skipAuthEvents`). Es un contrato **interno** del paquete
  `frontend/src/services`, sin consumidores fuera de `frontend/src`.
- **Contrato de los 6 métodos `download*`**: cambia el **tipo de retorno** a
  `Promise<{ blob: Blob; filename: string }>` (excepción acotada a AC1). Los
  parámetros de entrada no cambian y el comportamiento visible lo preserva
  el helper `triggerBrowserDownload(blob, filename)` invocado por los hooks de
  feature.
- **Contrato de la política de retry de TanStack Query**: `queries.retry`
  pasa de `(failureCount) => failureCount < 2` a `false`. Los **overrides por
  query** que contradicen la política se eliminan: `SUPERVISOR_DASHBOARD_CONFIG`
  (`features/supervisor-dashboard/config/performance.ts:14,22,30`) declara
  `retry: 1`, `retry: 2` y `retry: 3`, que sobrevivirían al default y
  reintroducirían el doble bucle en las queries más pesadas. Los overrides
  que ya son `retry: false` (`useReportsQuery.ts:22`, `useHealthQuery.ts:78,86`,
  `useLeavesQuery.ts:17`, `useConfigQuery.ts:92`) son redundantes y se
  eliminan para no dejar dos políticas distintas escritas en el código.
  **Excepción verificada en código**: de los dos de `useHealthQuery.ts`, solo
  se elimina el de la **query** (redundante con el default `false`); el de
  `apiClient.get("/health", { retry: false })` (`useHealthQuery.ts:78`) se
  **mantiene** porque es **política de transporte** —un sonda de salud que
  falla se reporta de inmediato, sin 2 reintentos con backoff— y no un
  override de la capa de cache.
- **Contrato del evento `rate_limited`**: **no cambia** (mismo nombre, mismo
  payload `{status, url, retryAfter}`, mismo consumidor). Se documenta para
  que el cambio de implementación (de parche global a emisión del cliente) sea
  transparente.
- **Query keys**: cambian (se canonicalizan). **Impacto de caché**: el
  `buster` de `src/lib/queryCache.ts` deriva de la versión de build, así que
  el release que introduce las claves canónicas invalida el caché persistido
  de forma coherente. Los usuarios con sesión iniciada en un dispositivo
  compartido quedan con caché vacío tras el deploy (comportamiento ya
  contemplado por la spec 032).
- **PWA/Workbox**: el manifiesto de precache no cambia (los services no son
  assets).
- **E2E**: los selectores no cambian. `e2e/offline.spec.ts` es el test más
  sensible (cola de escritura offline + caché persistido).

## Riesgos y rollback

| Riesgo                                                                                                    | Mitigación                                                                                                                                          | Rollback                        |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| La migración a `apiClient` cambia el comportamiento de error (lanza vs devuelve)                          | el modo de error se decide **por endpoint** en el PR de cada lote, no de forma global; `authService` va en PR aparte                                | revertir el lote                |
| Un 404 que antes era "sin datos" ahora lanza excepción y rompe una vista                                  | `apiClient` gana un modo "no-launching" para endpoints donde el 404 es de negocio (p. ej. brand-logo)                                               | revertir el service afectado    |
| El dedup de GET en vuelo rompe una petición legítima que depende de respuestas distintas con la misma URL | la clave de dedup incluye (método, URL, auth) como ya hace `apiClient.ts:426-442`; los params van en la query string                                | revertir el cliente             |
| El evento `rate_limited` deja de dispararse (el toast no aparece)                                         | test explícito de emisión del evento en `apiClient.spec.ts` (AC4)                                                                                   | revertir `fetchGuards`          |
| La barra de carga parpadea (flicker) por consultas muy rápidas                                            | piso mínimo de ~120 ms basado en la **duración real** de la query, no en un timer de simulación                                                     | volver al comportamiento actual |
| La canonicalización de query keys deja alguna query huérfana                                              | el guardrail de la Fase E verifica que **toda** raíz usada está en una de las dos allowlists                                                        | revertir la tabla `QUERY_KEYS`  |
| `authService` migrado rompe el login/MFA/PIN                                                              | PR separado, e2e de smoke + user-flows + kiosk antes de mergear                                                                                     | revertir solo `authService`     |
| Un 401 de credencial inválida dispara `unauthorized` y **cierra la sesión** (regresión de `authService`)  | `apiClient` suprime `unauthorized` y `rate_limited` en `/auth/login`, `/auth/mfa/validate` y `/auth/kiosk-login` (`skipAuthEvents`); test explícito | revertir la supresión           |
| El doble bucle de reintentos amplifica un 5xx a **9** peticiones HTTP                                     | dueño único del retry en `apiClient` + `queries.retry: false`; test que fija el máximo en 3                                                         | revertir `queries.retry`        |
| El guardrail de AC9 no puede aterrizar porque la spec 033 sigue abierta                                   | gate de orden explícito: T24 no se mergea antes que 033 (T11 y T14); la whitelist no amortigua con entradas temporales                              | revertir T24                    |
| Un PDF/XLSX corrupto por `response.text()`                                                                | modo binario en `apiClient` + test que compara bytes y `Content-Disposition`                                                                        | revertir el modo binario        |
| `FormData` con `Content-Type: application/json` rompe el upload                                           | el cliente omite `Content-Type` cuando el body es `FormData`                                                                                        | revertir el soporte de FormData |
| El timeout de 15 s corta operaciones legítimas lentas (exportaciones)                                     | `apiClient` ya permite señal del llamante; los endpoints de exportación usan un timeout explícito mayor                                             | ajustar el timeout por endpoint |

## Verificación

```bash
cd frontend
npm run check                                   # tsc tras cada lote
npm run lint                                    # budget 0/0
npm run test:run -- src/services/apiClient.spec.ts src/lib/queryClient.spec.ts src/tests/guardrails
npm run test:guardrails                         # incluye httpClientGuardrails
npm run validate:ci                             # suite completa (format, lint, tsc, tests, build)
npm run e2e:staging                             # 56 tests: smoke, user-flows, offline, kiosk, perf

# Raíz
npm run spec:check
npm run docs:check
npm run preflight
```
