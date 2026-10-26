# Resultado Spec 080: subárbol de vista del Worker Portal

## Método

Se añadió `worker-portal:view` con el helper `RenderProfiler` alrededor de
`WorkerPortalView` en el container. El helper ya retorna children sin profiler
en modo producción. `WorkerPortal.view.tsx` no se modificó por su marca
`UI-PROTECTED`.

El runner `measure:renders` midió tres contextos fríos en Vite dev, Chromium
153, CPU 4×, viewport 412×823. Vite corrió en `127.0.0.1:5174`; API y proxy
apuntaron al staging local `127.0.0.1:8080`. El runner hizo login y navegación
directa, sin pulsar acciones de negocio.

## Resultados por scope

| Scope                  | Commits medianos | `actualDuration` mediana | `baseDuration` mediana | Máximo por commit mediano |
| ---------------------- | ---------------: | -----------------------: | ---------------------: | ------------------------: |
| `worker-portal` (ruta) |                5 |                 145,3 ms |               189,0 ms |                   84,6 ms |
| `worker-portal:view`   |                4 |                 102,7 ms |               114,9 ms |                   54,8 ms |

En las tres muestras, el scope de vista registró un mount y tres updates; el
scope de ruta registró un mount y cuatro updates. Eventos descartados: 0/3.
Los scopes son anidados y tuvieron distinto número de commits; se presentan
separados, no se suman ni se restan para atribuir el costo restante al hook.
La mediana del scope visual confirma que es un foco de seguimiento, pero estos
timings de desarrollo no estiman un beneficio de producción.

## Estado y límites

- La sincronización inicial terminó durante la corrida; Vite registró errores
  de conexión Socket.IO/WebSocket y `EPIPE` al usar el proxy. No se declara un
  resultado sin errores de tiempo real.
- El runner solo navega y no ejecuta mutaciones de negocio. La imagen frontend
  de staging sigue en `sha256:8cf223b927a58f697ceda99de0a00a04e70888f35ff8b1384fa156677a57b54b`; no se reconstruyeron servicios.
- La configuración temporal `frontend/.env.development.local` fue retirada y
  el servidor Vite temporal en 5174 fue detenido; el Vite existente de otro
  proyecto en 5173 no se tocó.
- Evidencia cruda: [perfil de ruta y vista](./worker-portal-view-render-profile-2026-10-24.json).

## Siguiente paso

El subárbol visual es el mayor scope medido, pero su archivo raíz está marcado
UI-protected. Para mantener ese límite, el siguiente experimento debe revisar
los props y actualizaciones originadas por `useWorkerPortalData` desde el
container y buscar un cambio de estado evitable antes de entrar a editar la
vista. Si el ganador requiere cambiar componentes internos de la vista, se
necesitará aprobación humana para ese archivo.
