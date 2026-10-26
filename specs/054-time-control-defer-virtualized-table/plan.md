# Plan 054: Time Control Defer Virtualized Table

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir una prueba Playwright móvil que capture los chunks de tabla en frío y después del scroll; confirmar la descarga actual antes de cambiar el código.
2. Añadir un wrapper liviano con `IntersectionObserver`, fallback de altura reservada y carga eager si el navegador no soporta el observer.
3. Sustituir el montaje inicial de `TimeRecordTable` por el wrapper y probar la activación por intersección y el fallback funcional cuando falta `IntersectionObserver`.
4. Reconstruir staging y ejecutar la batería completa para guardar la comparación de las tres muestras frías.
5. Ejecutar preflight, completar evidencia y tareas.

## Archivos a tocar

| Archivo                                                                     | Cambio                                                      |
| --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `frontend/src/features/time-control/components/DeferredTimeRecordTable.tsx` | Gate de viewport pequeño que importa la tabla al acercarse. |
| `frontend/src/features/time-control/components/TimeRecordTable.tsx`         | Exportar el tipo de props sin cambiar su comportamiento.    |
| `frontend/src/features/time-control/views/TimeControl.view.tsx`             | Montar el wrapper diferido en el área de registros.         |
| `frontend/e2e/performance.spec.ts`                                          | Comprobar carga móvil fría y carga tras scroll.             |
| `specs/054-time-control-defer-virtualized-table/`                           | Requisitos, plan, tareas y resultado.                       |
| `specs/039-frontend-performance-battery/evidencia/`                         | Preservar la nueva corrida y comparación.                   |

## Contratos afectados

Sin cambios HTTP, Prisma, OpenAPI, SDK, migraciones ni API de callbacks. Las props y el comportamiento interno de `TimeRecordTable` permanecen iguales.

## Riesgos y rollback

- Riesgo: la tabla podría tardar hasta el primer scroll si se mantiene fuera del viewport. El observer se activa al entrar la sección y no se vuelve a desactivar.
- Riesgo: fallback demasiado bajo puede desplazar el contenido al cargar. Reservar el mínimo ya usado por la tabla (`min-h-[400px]`) y verificar con Lighthouse CLS.
- Rollback: restaurar el montaje directo de `TimeRecordTable` en la vista y retirar el wrapper.

## Verificación

- `E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api fnm exec --using 26.10.0 -- npm --prefix frontend run e2e -- --project=perf --no-deps e2e/performance.spec.ts --grep "Time Control defers the virtualized table"`
- `fnm exec --using 26.10.0 -- npm --prefix frontend run check`
- `fnm exec --using 26.10.0 -- npm run perf:staging`
- `fnm exec --using 26.10.0 -- node .agents/skills/ci-preflight/scripts/preflight.cjs`
