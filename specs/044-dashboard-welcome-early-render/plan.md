# Plan 044: Mostrar antes la bienvenida del Dashboard

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir tests de vista antes del cambio para los estados de carga de overview/reportes y estado listo.
2. Mantener la condición actual de readiness de datos, pero usarla solo para seleccionar entre el spinner del área de widgets y la grilla; colocar `WelcomePanel` antes de esa selección.
3. Mantener `Container` y el layout final iguales. No montar widgets ni modales dependientes de datos mientras siga activa la carga inicial.
4. Rebuild del frontend de staging; correr tres muestras secuenciales de la ruta Dashboard y tres Lighthouse fríos con almacenamiento reseteado.
5. Comparar readiness con la mediana de spec043 (675 ms) y Lighthouse como diagnóstico, sin reclamos causales si hay solapamiento o ruido.
6. Completar validadores y registrar evidencia/prioridad siguiente.

## Archivos a tocar

| Archivo                                                        | Cambio                                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `frontend/src/features/dashboard/views/Dashboard.view.tsx`     | Renderizar bienvenida antes del estado de carga de widgets; mantener el spinner y el layout final. |
| `frontend/src/tests/features/dashboard/DashboardView.test.tsx` | Cubrir bienvenida durante carga y widgets al terminar.                                             |
| `frontend/e2e/performance.spec.ts`                             | Reusar las marcas y el registro de solicitudes existentes para validar readiness en staging.       |
| `specs/044-dashboard-welcome-early-render/evidencia/`          | Guardar muestras, resumen Lighthouse e informe de salida.                                          |
| `.jules/bolt.md`                                               | Registrar resultado y siguiente foco con evidencia.                                                |

## Contratos afectados

Sin cambios: rutas, schemas Fastify, `swagger.json`, SDK, Prisma y migraciones.

## Riesgos y rollback

El indicador de sincronización se verá bajo la bienvenida durante la carga; widgets y sus hooks deben seguir sin montarse hasta que estén listos los datos. Si el cambio no reduce la readiness visible o altera el layout final, revertir la reorganización del estado de carga. El cambio de presentación de `Dashboard.view.tsx` requiere `ui/human-approved` en cualquier PR antes de merge.

## Verificación

- `fnm exec --using 26.10.0 -- npm run test:run -- src/tests/features/dashboard/DashboardView.test.tsx` (desde `frontend/`).
- `fnm exec --using 26.10.0 -- npm run lint` y `npm run format:check` (desde `frontend/`).
- `fnm exec --using 26.10.0 -- npm run build` y `npm run check:bundle-budget` (desde `frontend/`).
- Rebuild staging y tres capturas: `fnm exec --using 26.10.0 -- npm run e2e:staging -- --project=perf --no-deps --grep=startup --workers=1` (desde `frontend/`).
- Tres corridas frías con `fnm exec --using 26.10.0 -- npx lhci autorun --config=.lighthouserc-dashboard-cold.json` (desde `frontend/`).
- `fnm exec --using 26.10.0 -- node .agents/skills/ci-preflight/scripts/preflight.cjs` (desde raíz).
