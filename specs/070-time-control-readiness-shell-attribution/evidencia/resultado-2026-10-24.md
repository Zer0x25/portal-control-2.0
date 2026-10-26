# Resultado Spec 070: atribución del shell durante readiness

## Procedimiento

- Vite development en `127.0.0.1:5174`, API local de staging en
  `127.0.0.1:8080/api`, Chromium 153 y viewport 412×823.
- Tres contextos fríos de Control Horario con CPU 4×. Se perfilaron `App`,
  persistencia de queries, router, overlay inicial, indicadores globales,
  toasts, notificador de acceso y rutas.
- Las ventanas se correlacionaron con `validateInstanceId` y
  `fetch-resolved` → `read-body-resolved`. Cada muestra guardó 196–236 eventos;
  no se descartaron commits.

## Mediciones

Milisegundos y commits, mínimo / mediana / máximo con `n=3`:

| Scope                      | Commits totales en 1 s | Commits durante validación | `actualDuration` durante validación | Commits durante lectura JSON | `actualDuration` durante lectura JSON |
| -------------------------- | ---------------------: | -------------------------: | ----------------------------------: | ---------------------------: | ------------------------------------: |
| `app:application`          |           26 / 29 / 32 |                  3 / 3 / 3 |                    5,8 / 9,7 / 16,9 |                    1 / 1 / 2 |                       1,1 / 1,6 / 1,6 |
| `app:query-cache-provider` |           26 / 29 / 32 |                  3 / 3 / 3 |                   7,4 / 11,7 / 19,2 |                    1 / 1 / 2 |                       1,6 / 1,6 / 2,7 |
| `app:router`               |           25 / 28 / 31 |                  2 / 2 / 2 |                     5,0 / 5,9 / 9,5 |                    1 / 1 / 1 |                       0,3 / 1,6 / 1,6 |
| `app:initial-sync-overlay` |              7 / 7 / 7 |                  0 / 0 / 0 |                           0 / 0 / 0 |                    0 / 0 / 0 |                             0 / 0 / 0 |
| `app:top-loading`          |              4 / 5 / 5 |                  0 / 0 / 0 |                           0 / 0 / 0 |                    0 / 0 / 0 |                             0 / 0 / 0 |
| `app:background-activity`  |              1 / 1 / 1 |                  0 / 0 / 0 |                           0 / 0 / 0 |                    0 / 0 / 0 |                             0 / 0 / 0 |
| `app:toast-container`      |              2 / 2 / 2 |                  0 / 0 / 0 |                           0 / 0 / 0 |                    0 / 0 / 0 |                             0 / 0 / 0 |
| `app:access-notifier`      |              2 / 2 / 2 |                  0 / 0 / 0 |                           0 / 0 / 0 |                    0 / 0 / 0 |                             0 / 0 / 0 |
| `app:routes`               |           12 / 14 / 15 |                  0 / 0 / 0 |                           0 / 0 / 0 |                    0 / 0 / 0 |                             0 / 0 / 0 |

`validateInstanceId` duró 95,7 / 102,9 / 136,6 ms; la lectura JSON duró
25,3 / 40,7 / 66,6 ms. `app:providers` y `app:root` también registraron tres
commits de validación; son scopes padres y no se deben sumar a los hijos.

## Lectura y siguiente foco

El overlay inicial, los indicadores, los toasts, el notificador y `Routes` no
registraron commits durante validación ni lectura JSON. En cambio, `App`
registró tres commits de validación por muestra, el proveedor de caché tres y el
router dos. La captura estrecha el foco a estado/hooks de `App` y al estado del
proveedor de queries; todavía no identifica qué valor cambió ni demuestra que
un componente cause la espera de producción.

El siguiente método es registrar, solo con el flag diagnóstico, cambios
booleanos/status de los hooks de `App` y correlacionarlos con sus commits. No
guardar datos de usuario ni payloads. Mantener cualquier optimización funcional
en pausa hasta atribuir la actualización con evidencia adicional.

Los tiempos de Vite dev son de atribución únicamente: la lectura JSON de
25,3–66,6 ms no se compara con los 271,1–283,6 ms de Specs 067–068 en el probe
de producción. Durante estos perfiles el servidor Vite registró errores
`Socket.IO connect_error` y cierres de proxy `EPIPE`; el runner no midió ese
canal, por lo que este ruido también limita la interpretación.

## Privacidad y verificación

- El JSON guarda scopes, fases, marcas, duraciones y la ruta fija; no retiene
  sesión, credenciales, query strings, fragmentos ni respuestas.
- Tres muestras completadas, con 196–236 eventos cada una y cero descartados.
- El código de scopes usa `profileReactSubtree`, que devuelve los hijos sin
  insertar un componente Profiler en producción.
- Build de producción aprobado. Los bundles no contienen `Profiler`, el buffer
  `__portalRenderCommitEvents` ni el límite `MAX_PROFILE_COMMIT_EVENTS`; el
  helper se reduce a devolver el elemento hijo. Las etiquetas sobreviven como
  argumentos inertes, sin crear boundaries ni eventos.
- Evidencia cruda:
  [`react-shell-readiness-profile-2026-10-24.json`](./react-shell-readiness-profile-2026-10-24.json).
