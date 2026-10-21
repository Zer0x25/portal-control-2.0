# ADR-0024: Frontend HTTP Client Consolidation — Un solo cliente HTTP

- Estado: Propuesto
- Fecha: 2026-10-21
- Autores: zer0x

## Contexto

`portal-control` construyó un cliente HTTP endurecido en
`frontend/src/services/apiClient.ts` con timeout por
`AbortSignal.timeout` (15 s), retry **GET-only** con backoff exponencial y
respeto de `Retry-After` (`apiClient.ts:20-21,310-341`), dedup de GET en vuelo
por (método, URL, auth) (`apiClient.ts:426-442`), `ApiHttpError` que
**preserva el status numérico** (`apiClient.ts:37-49`) y tipado contra
`backend/docs/swagger.json` vía `src/types/api` (`apiClient.ts:460-647`).

**Solo 7 de 24 services lo usan.** Los otros 13 mantienen `fetch` crudo, lo
que produce tres defectos verificables:

1. **Los errores pierden el status.** Los 13 services lanzan
   `new Error(\`Error ${response.status}: ...\`)`en vez de`ApiHttpError`. El
guard global `hasHttpStatus`de`src/lib/queryClient.ts:16-21,48` **no puede
   matchear** un status en ellos → la política de retry global **reintenta un
   403 y un 404**, que son respuestas definitivas.
2. **No hay timeout, retry ni dedup** en el 54% de los services: un request
   colgado cuelga la UI; un 5xx transitorio es un error duro; dos GET
   concurrentes idénticos se ejecutan dos veces.
3. **Dos políticas de 429 compitiendo** _(resuelto en T3 + T15)_:
   `apiClient.ts:21,26` reintenta el 429
   respetado `Retry-After`, mientras `src/services/fetchGuards.ts`
   **monkey-patchea `window.fetch` globalmente** (instalado en
   `src/main.tsx:12`) y dispara un `CustomEvent("rate_limited")` que
   `src/store/useStore.ts:52-66` convierte en toast. Los 13 services con
   `fetch` crudo heredan el patch sin haberlo pedido.

A esto se suman tres bugs abiertos que la misma fragmentación permite:

4. **Caché stale**: la raíz de reportes se invalida en **4 sitios** — 3 en
   `src/hooks/useReportMutations.ts:11,18,25` y 1 en
   `src/features/dashboard/hooks/useDashboardClockActions.ts:27` — pero con
   `["reports"]`, mientras `src/hooks/queries/useShiftReportsInfinite.ts:11`
   usa `["shiftReports", params]` → la invalidación **no matchea** (el match de
   TanStack es por prefijo exacto del array) →
   `features/logbook/components/ClosedReportsModal.tsx:43` muestra reportes
   cerrados desactualizados. La misma familia de bug se repite con
   `["calendar"]` (8 invalidaciones) frente a `["calendarMatrix", ...]`.
5. **La barra de carga miente**: `src/hooks/useNavigationLoading.ts` la
   detiene con un `setTimeout` **fijo de 400 ms** ("simulamos un pequeño
   retraso"), sin relación con la carga real de datos.
6. **Derivación de namespaces**: conviven camelCase (`shiftPatterns`,
   `assignedShifts`), kebab-case (`audit-logs` en
   `src/hooks/queries/useProactiveDetectionsQuery.ts:12` y
   `attendance-analytics` en `useAttendanceAnalytics.ts:44`) y **dos** formas de
   clave para `config` (`["config", key]` genérico vs sub-keys hardcodeados
   en `useConfigQuery.ts:19,27,37`). Las raíces kebab-case no están ni en
   `PERSISTED_QUERY_ROOTS` ni en `SENSITIVE_QUERY_ROOTS`
   (`src/lib/queryCache.ts:33-60`): escapan de ambas allowlists.
7. **Doble bucle de reintentos**: `apiClient` reintenta 2 veces
   (`MAX_GET_RETRIES = 2`) **y** TanStack Query reintenta 2 veces
   (`src/lib/queryClient.ts:16-21,48`) → un GET con 500/503 dentro de un `useQuery`
   genera **9** peticiones HTTP. `hasHttpStatus` solo clasifica 401/403/404,
   así que un 400/409/422 se reintenta.
8. **El cliente no cubre el tráfico a migrar** _(resuelto en T2)_: no
   soporta respuestas
   binarias (`handleResponse` hace `response.text()` y corrompe PDF/XLSX),
   ni cuerpos `FormData` (`post` fuerza `application/json`), ni el método
   `PATCH`. Además dispara `unauthorized` ante cualquier 401, lo que rompe
   `authService` si se migra sin supresión.

## Decisión

1. **`apiClient` es el único cliente HTTP del frontend.** Se amplía el
   cliente existente (no se crea otro) con: un helper `request<T>()` tipado
   contra `src/types/api`, un **modo de error no-launching** para los
   endpoints donde el 404 es un caso de negocio legítimo, y la emisión del
   evento `rate_limited` desde el propio cliente, un método `patch()`, soporte
   de cuerpo `FormData` y un modo de respuesta binaria (punto 5). Los 13
   services con `fetch` crudo migran, **conservando su firma pública y sus
   tipos de retorno** (salvo la excepción acotada del punto 4); el contrato
   HTTP no cambia.

2. **Una sola política de red.** Timeout, retry (GET-only, por idempotencia),
   dedup, status de error y tratamiento de 429 viven **exclusivamente** en
   `apiClient`. `src/services/fetchGuards.ts` se elimina y con él el
   monkey-patch de `window.fetch`; el evento `rate_limited` conserva su
   **nombre, payload (`{status, url, retryAfter}`) y consumidor** (el toast
   de `src/store/useStore.ts:52-66`), de modo que el cambio de implementación
   es transparente para el resto del sistema.
   **El retry de transporte tiene un único dueño: `apiClient`.** TanStack
   Query deja de reintentar (`queries.retry: false`) y sus overrides por
   query (`SUPERVISOR_DASHBOARD_CONFIG`) se eliminan: con dos capas de retry,
   un 5xx se amplifica a 9 peticiones. El clasificador de status bloquea
   **todo 4xx no transitorio**: cualquier status en el rango 400-499 salvo 408
   (request timeout) y 429 (rate limit), que sí son transitorios.
   **Los eventos globales no se emiten en endpoints de autenticación
   anónima** (`/auth/login`, `/auth/mfa/validate`, `/auth/kiosk-login`): allí
   un 401 significa "credencial inválida", no "sesión expirada", y no debe
   cerrar la sesión ni disparar el toast global de rate limit.

3. **Una sola raíz canónica de query key por recurso**, declarada en una
   tabla (`frontend/src/lib/queryKeys.ts`) que es la **única fuente de
   verdad**: toda raíz usada en el código debe estar en
   `PERSISTED_QUERY_ROOTS` o en `SENSITIVE_QUERY_ROOTS`
   (`src/lib/queryCache.ts:33-60`), que **siguen siendo allowlists
   positivas**. Se elimina la coexistencia de namespaces de `config` y la
   divergencia camelCase/kebab-case.

4. **Los side-effects de DOM salen de la capa de datos.** Un service no crea
   nodos DOM ni dispara descargas: `document.createElement` +
   `URL.createObjectURL` + `.click()` (hoy en `kpiService.ts:154-162,194-202`,
   `exportService.ts`, `shiftReportService.ts`) pasan a los hooks de feature.
   La capa de datos transporta; la capa de UI presenta.
   **Consecuencia asumida**: los 6 métodos `download*` cambian su tipo de
   retorno a `Promise<{ blob: Blob; filename: string }>` — única excepción a la
   regla de "firma pública intacta" — y el helper
   `triggerBrowserDownload(blob, filename)` preserva el comportamiento visible.
5. **El cliente cubre el tráfico real**: `apiClient` gana `patch()`, soporte
   de cuerpo `FormData` (sin `Content-Type` manual) y un modo de respuesta
   binaria (`{ blob, headers, filename? }`) que no corrompe PDF/XLSX ni
   descarta el `Content-Disposition`.

## Alternativas consideradas

1. **Crear un cliente nuevo en vez de ampliar `apiClient`** — descartada
   porque duplicaría la lógica de retry/dedup/timeout que ya está probada y
   Con el cliente nuevo habría dos políticas de 429 otra vez.
2. **Dejar los 13 services con `fetch` y añadirles timeout/retry a mano** —
   descartada: es 13 × la misma implementación, y el siguiente service
   nuevo la volvería a duplicar. La automatización es precisamente el
   problema que la spec 032 resolvió para el estado.
3. **Migrar los 13 services al framework HTTP del backend** — no aplica:
   el backend es Fastify y el cliente es del navegador.
4. **Normalizar los namespaces de query key por convención en los comentarios,
   sin tabla canónica** — descartada: la convención ya se rompió (kebab-case
   `audit-logs`); el enforcement tiene que ser mecánico. La tabla
   `queryKeys.ts` convierte ~50 claves literales en referencias a constantes.
5. **Eliminar el evento `rate_limited` y dejar solo el retry silencioso** —
   descartada porque el usuario **necesita saber** que el backend está
   limitando: el toast es información accionable (reintentar más tarde), no
   ruido.
6. **Mantener `fetchGuards` como parche global y eliminar el retry 429 de
   `apiClient`** — descartada: el parche global no puede aplicar timeout ni
   dedup y llega a todo el código (incluido el de terceros); el cliente
   explícito es el único sitio donde se puede decidir.

## Consecuencias

Positivas:

- **El status HTTP deja de perderse**: `hasHttpStatus` puede distinguir
  401/403/404/409/429, y los errores definitivos dejan de reintentarse.
- **Toda la red del producto tiene timeout, retry y dedup**: un request
  colgado deja de colgar la UI.
- **El bug de caché stale se corrige** y, con la tabla canónica, la clase de
  bugs "dos raíces para un recurso" queda cerrada por construcción.
- La barra de carga refleja la realidad, lo que **mejora la percepción de
  velocidad** sin cambiar el tiempo real de carga.
- Un solo lugar decide la política de red → **auditable y testeable** (hoy
  está repartido en 16 ficheros).

Negativas / costos aceptados:

- **TanStack Query deja de reintentar por su cuenta**: las queries cuyo
  `queryFn` no pase por `apiClient` (o que usen un cliente distinto)
  pierden la red de seguridad del retry de TanStack. Es el precio de no
  duplicar el retry, y la mitigación es que **toda** llamada de red pase
  por `apiClient` (invariante del guardrail AC9).
- **13 services cambian**, en 5 lotes. El diff es grande aunque sea mecánico:
  la revisión debe concentrarse en las **firmas públicas**, que no cambian,
  y en los **modos de error**, que se deciden endpoint a endpoint.
- El modo no-launching introduce **dos semánticas de error** en el cliente
  (lanza vs devuelve). Se mitiga con tipos distintos y documentados, no con
  un flag booleano.
- El dedup de GET puede **suprimir** dos peticiones idénticas concurrentes
  que la app creía distintas. La clave incluye método + URL + auth, que es
  lo que hoy ya usa `apiClient.ts:426-442`; los params van en la query
  string, así que no hay colisión real.
- El timeout de 15 s puede **cortar** una exportación legítima lenta; esos
  endpoints pasan a usar un timeout explícito mayor.
- La tabla `queryKeys.ts` es **código nuevo que mantener**; a cambio, las
  claves dejan de estar duplicadas en ~50 sitios.
- Los 6 métodos `download*` cambian su tipo de retorno: los consumidores
  pasan de "la descarga ya ocurrió" a "recibo el blob y disparo la
  descarga". Es el cambio de contrato más visible de la spec.

## Referencias

- `frontend/src/services/apiClient.ts:20-21,37-49,259-274,277-285,310-341,426-442,460-647`
  — el cliente endurecido que se convierte en el único.
- `frontend/src/services/fetchGuards.ts` — el parche global que se elimina
  (**eliminado** en T15).
- `frontend/src/main.tsx:12` — instalación del parche que se elimina
  (**eliminada** en T15).
- `frontend/src/store/useStore.ts:52-66` — consumidor del evento `rate_limited`
  (el contrato **no cambia**).
- `frontend/src/lib/queryClient.ts:16-21,48` — el clasificador de status y
  el retry de TanStack Query que dejan de duplicar el de `apiClient`.
- `frontend/src/features/supervisor-dashboard/config/performance.ts`
  — los overrides por query (`retry: 1/2/3`) que se eliminan (T5).
- `frontend/src/utils/triggerBrowserDownload.ts` — el helper que recibe el
  binario y dispara la descarga en el navegador (T8).
- `frontend/src/hooks/useReportMutations.ts` y
  `frontend/src/hooks/queries/useShiftReportsInfinite.ts:11` — el bug de
  caché stale.
- `frontend/src/hooks/useNavigationLoading.ts` — el timer de 400 ms.
- `frontend/src/hooks/useKpiCalculations.ts` — el fetch manual que se
  elimina.
- `frontend/src/features/governance/hooks/useSystemMaintenanceController.ts` y
  `useSecurityInsightsController.ts` — los 9 `fetch(` fuera de `src/services/`
  que se migran.
- `frontend/src/hooks/useWeather.ts` y
  `frontend/src/components/ui/UserManualModal.tsx` — las dos entradas
  legítimas de la whitelist del guardrail (API externa y asset estático).
- `frontend/src/lib/queryCache.ts:33-60` — las allowlists que siguen siendo
  positivas.
- `frontend/src/services/{config,holiday,seeding,health,email,kpi,shiftReport,auth,auditLog,correction,scheduling,export,import}Service.ts`
  — los 13 services a migrar.
- [spec 034](file:///specs/034-frontend-http-client-consolidation/spec.md) —
  implementación, AC y plan.
- [ADR-0004](0004-jwt-fail-fast.md) — el precedente de "fallar explícito" en
  este repo.
- [ADR-0022](0022-ui-ux-consolidation.md) — la consolidación de estado
  remoto que esta spec complementa en la capa de transporte.
