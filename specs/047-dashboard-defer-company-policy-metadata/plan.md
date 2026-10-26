# Plan 047: Dashboard Defer Company Policy Metadata

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir regresiones para confirmar que el Dashboard no pide metadata al iniciar y que conserva la URL del reglamento.
2. Eliminar el efecto redundante de `useToolsController`; mantener la URL configurada y el endpoint de archivo como valor predeterminado.
3. Medir el tráfico del Dashboard en staging antes y después de reconstruir el frontend; guardar tres muestras posteriores y la comparación.
4. Ejecutar las pruebas enfocadas, la validación frontend y el preflight del repositorio; confirmar los cambios verificados.

## Archivos a tocar

| Archivo                                                            | Cambio                                                           |
| ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `frontend/src/features/dashboard/hooks/useToolsController.ts`      | Use the configured or fixed file URL without a startup request.  |
| `frontend/src/tests/features/dashboard/useToolsController.test.ts` | Assert no policy metadata request and preserve the link target.  |
| `frontend/e2e/performance.spec.ts`                                 | Assert policy metadata is absent from Dashboard startup traffic. |
| `specs/047-dashboard-defer-company-policy-metadata/`               | Record criteria, execution plan, tasks, and staging evidence.    |
| `.jules/bolt.md`                                                   | Record the measured request reduction and limits.                |

## Contratos afectados

Ninguno. No se modifican rutas, esquemas, SDK, Prisma ni OpenAPI.

## Riesgos y rollback

La metadata solo contiene la ruta fija al archivo. Si el contrato llega a soportar URLs variables en el futuro, la herramienta deberá volver a obtener esa información bajo demanda. El rollback restaura la lectura de metadata en `useToolsController` y retira las aserciones de performance.

## Verificación

- Desde `frontend/`: `fnm exec --using 26.10.0 -- npm exec -- vitest run src/tests/features/dashboard/useToolsController.test.ts`
- Desde `frontend/`, staging: `E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api PERFORMANCE_RESULTS_DIR=<directorio-de-muestra> fnm exec --using 26.10.0 -- npm exec -- playwright test e2e/performance.spec.ts --project=perf --no-deps --workers=1 --grep 'Dashboard startup avoids'`
- Desde `frontend/`: `fnm exec --using 26.10.0 -- npm run validate:ci`
- `fnm exec --using 26.10.0 -- npm run preflight`
