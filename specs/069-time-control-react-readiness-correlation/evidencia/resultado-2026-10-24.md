# Resultado Spec 069: correlación React y readiness

## Procedimiento

- Vite development en `127.0.0.1:5174`, API local de staging en
  `127.0.0.1:8080/api`, Chromium 153, Control Horario en 412×823.
- Tres contextos fríos, navegación directa y CPU 4× por CDP. El runner guardó
  commits acotados de React Profiler para raíz, providers, shell, ruta y vista.
- Se correlacionó `validateInstanceId` y la ventana `fetch-resolved` →
  `read-body-resolved` con `startTime`/`commitTime` del Profiler.
- No se añadieron query markers ni solicitudes de medición. Las muestras no
  incluyen sesión, credenciales, query strings ni payloads.

## Mediciones

Milisegundos y commits, mínimo / mediana / máximo con `n=3`:

| Scope               | Commits totales en 1 s | Commits durante validación | `actualDuration` durante validación | Commits durante lectura JSON | `actualDuration` durante lectura JSON |
| ------------------- | ---------------------: | -------------------------: | ----------------------------------: | ---------------------------: | ------------------------------------: |
| `app:root`          |           22 / 22 / 27 |                  3 / 3 / 3 |                    9,1 / 9,6 / 12,1 |                    1 / 1 / 2 |                       0,8 / 1,3 / 7,6 |
| `app:providers`     |           22 / 22 / 27 |                  3 / 3 / 3 |                    9,1 / 9,6 / 12,1 |                    1 / 1 / 2 |                       0,8 / 1,3 / 7,6 |
| `app:shell`         |           22 / 22 / 27 |                  3 / 3 / 3 |                    6,6 / 8,2 / 11,1 |                    1 / 1 / 2 |                       0,8 / 1,2 / 6,6 |
| `time-control`      |              6 / 7 / 7 |                  0 / 0 / 0 |                           0 / 0 / 0 |                    0 / 0 / 0 |                             0 / 0 / 0 |
| `time-control:view` |              5 / 6 / 6 |                  0 / 0 / 0 |                           0 / 0 / 0 |                    0 / 0 / 0 |                             0 / 0 / 0 |

`validateInstanceId` duró 88,9 / 93,2 / 95,8 ms. La lectura del cuerpo JSON
duró 43,3 / 46,1 / 51,3 ms. No se descartó ningún evento de Profiler.

## Lectura y siguiente foco

En las tres muestras hubo tres commits de la aplicación que se solaparon con la
validación; sus scopes aparecen en raíz, providers y shell porque son límites
anidados del mismo árbol, no tres grupos de trabajo que deban sumarse. Durante
la lectura JSON se solapó uno o dos commits de shell por muestra, con 0,8–6,6
ms de `actualDuration`. La ruta y su vista no registraron commits en ninguna
ventana.

El candidato está en el árbol de aplicación montado antes de la ruta, no en la
vista de Control Horario. Esta captura todavía no distingue `App` de sus
proveedores ni identifica qué hook origina los updates. El perfil en Vite dev
midió 43,3–51,3 ms de lectura JSON; no se compara con los 271,1–283,6 ms
observados en las mediciones de producción de Specs 067–068. La diferencia
impide usar estos tiempos como resultado de mejora o como réplica del costo de
producción.

Siguiente método: subdividir el shell con límites alrededor de `App` y los
proveedores concretos; si la actividad sigue concentrada en `App`, perfilar sus
primeros componentes persistentes. Mantener esta instrumentación solo en dev y
no cambiar el comportamiento hasta atribuir un componente con evidencia.

## Privacidad y verificación

- El JSON registra el origen local del runner, pathname fijo, rol genérico,
  versión de Chromium, marcas y duraciones; no registra credenciales, tokens,
  query strings, fragmentos ni respuestas.
- El colector terminó con 3/3 contextos y cero eventos descartados; el JSON
  retiene los resultados por muestra y sus rangos agregados.
- Preflight: 6/6 etapas aprobadas, TypeScript backend/frontend y lint 0/0.
- Build de producción aprobado; inspección de 206 bundles sin scopes ni arrays
  de commits del Profiler de desarrollo.
- Evidencia cruda: [`react-readiness-render-profile-2026-10-24.json`](./react-readiness-render-profile-2026-10-24.json).
