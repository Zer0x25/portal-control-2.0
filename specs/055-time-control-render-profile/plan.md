# Plan 055: Time Control Render Profile

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Envolver la ruta protegida y el hijo de presentación con `RenderProfiler` para separar el tiempo total de la ruta del subárbol de vista, sin tocar la vista protegida.
2. Agregar Control horario al runner y opciones de filtro de ruta y viewport, conservando muestras individuales, medianas y perfiles anidados.
3. Ejecutar tres perfiles con contextos limpios contra la API de staging, sin mutar sus datos.
4. Registrar el resultado y sus límites; no optimizar hasta contar con un hot path verificable.

## Archivos a tocar

| Archivo                                                                   | Cambio                                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `frontend/src/App.tsx`                                                    | Añadir perfil de desarrollo al árbol de la ruta `time-control`.    |
| `frontend/src/features/time-control/containers/TimeControl.container.tsx` | Medir el subárbol de la vista sin editar `TimeControl.view.tsx`.   |
| `frontend/scripts/measure-renders.mjs`                                    | Permitir seleccionar ruta y viewport y reportar perfiles anidados. |
| `specs/055-time-control-render-profile/*`                                 | Guardar plan, tareas y evidencia interpretada.                     |

## Contratos afectados

Ninguno. No cambian rutas HTTP, OpenAPI, SDK, esquemas Prisma ni datos de negocio.

## Riesgos y rollback

El perfil de React añade overhead en desarrollo y no representa tiempos de producción. Los límites son opt-in por código de perfilado y `RenderProfiler` no instala una frontera en producción. Rollback: quitar los dos wrappers y la ampliación del runner; no requiere restaurar datos.

## Verificación

```bash
fnm exec --using 26.10.0 -- npm --prefix frontend run check
fnm exec --using 26.10.0 -- npm --prefix frontend run lint
fnm exec --using 26.10.0 -- npm --prefix frontend run build
fnm exec --using 26.10.0 -- env VITE_PROXY_TARGET=http://127.0.0.1:8080 VITE_API_URL=/api E2E_API_URL=http://127.0.0.1:8080/api npm --prefix frontend run measure:renders -- --route=time-control --viewport=mobile --samples=3 --output=../specs/055-time-control-render-profile/evidencia/render-profile-2026-10-24.json
fnm exec --using 26.10.0 -- npm run spec:check
fnm exec --using 26.10.0 -- npm run docs:check
```
