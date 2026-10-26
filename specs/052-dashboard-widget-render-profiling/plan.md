# Plan 052: Dashboard Widget Render Profiling

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Extender el callback del `React.Profiler` actual para guardar métricas por límite sin cambiar la salida de producción.
2. En el registro de widgets, crear wrappers de perfilado solo en desarrollo; las entradas de producción seguirán apuntando a los componentes originales.
3. Repetir tres navegaciones en contextos nuevos por ruta con `measure:renders`; agregar medianas y mantener muestras individuales para mostrar variación.
4. Medir contra el staging local con API seed, guardar el JSON y registrar sus límites antes de decidir una optimización funcional.

## Archivos a tocar

| Archivo                                                        | Cambio                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `frontend/src/utils/RenderProfiler.tsx`                        | Guardar métricas por fase y duración del commit en desarrollo.                                    |
| `frontend/src/features/dashboard/components/widgetRegistry.ts` | Envolver los widgets registrados con perfiles de desarrollo, con identidad de producción intacta. |
| `frontend/scripts/measure-renders.mjs`                         | Capturar tres muestras aisladas y resumir perfiles de ruta y widgets.                             |
| `specs/052-dashboard-widget-render-profiling/evidencia/*`      | Guardar resultados y análisis reproducible.                                                       |

## Contratos afectados

Ninguno. No cambian rutas HTTP, OpenAPI, SDK, esquemas Prisma ni datos de negocio.

## Riesgos y rollback

- El perfil de desarrollo añade overhead y no representa latencia de producción; se identifica junto al resultado y no se mezcla con Lighthouse.
- Los widgets sin renders posteriores al primero pueden tener pocos commits; las muestras crudas y los commits se conservan para evitar comparar solo sumas.
- El wrapper no debe llegar a producción; verificar el build y revertir el helper del registro si el código de perfilado aparece en los assets finales.
- Rollback: revertir este cambio de instrumentación y eliminar la evidencia; no requiere restaurar datos.

## Verificación

```bash
npm --prefix frontend run check
npm --prefix frontend run lint
npm --prefix frontend run build
VITE_PROXY_TARGET=http://127.0.0.1:8080 VITE_API_URL=/api E2E_API_URL=http://127.0.0.1:8080/api npm --prefix frontend run measure:renders -- --samples=3 --output=../specs/052-dashboard-widget-render-profiling/evidencia/render-profile-2026-10-24.json
npm run spec:check
npm run docs:check
```
