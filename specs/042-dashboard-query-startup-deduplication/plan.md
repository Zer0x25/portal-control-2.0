# Plan 042: Deduplicación de consultas al iniciar Dashboard

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir primero pruebas de hook que fijen cuándo se habilita la query pública de kiosco y pruebas de QueryClient para datos frescos, vencidos, invalidados, en vuelo y refresco forzado.
2. Parametrizar `useKioskEmployeesQuery(enabled)` y pasarle el modo de `useEmployees`; el valor predeterminado mantiene compatibilidad para consumidores directos.
3. Extraer un helper pequeño de sincronización que use `refetchQueries` para consultas activas stale con `cancelRefetch:false`; en mismatch usar invalidación forzada con la misma protección contra cancelación.
4. Mantener intactos `validateInstanceId`, roles, sync progress, query keys, staleTime, cache persistido, invalidaciones de mutaciones y sockets.
5. Reconstruir staging, verificar la ruta Dashboard y los flujos offline de kiosco, medir el conteo de solicitudes y guardar la comparación por versión/hash.
6. Ejecutar checks focalizados, build/presupuestos, guards, specs y enlaces; actualizar el ledger de Bolt con el próximo cuello medido.

## Archivos a tocar

| Archivo                                                      | Cambio                                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `frontend/src/hooks/queries/useEmployeesQuery.ts`            | Permitir desactivar la query pública de kiosco fuera del kiosco.                   |
| `frontend/src/hooks/useEmployees.ts`                         | Habilitar kiosco solo con `_isKiosk`.                                              |
| `frontend/src/lib/querySync.ts`                              | Política común de refresco activo stale y de invalidación forzada.                 |
| `frontend/src/store/slices/syncSlice.ts`                     | Usar refresco stale habitual y preservar el modo forzado ante cambio de instancia. |
| `frontend/src/tests/hooks/useEmployeesQueryGating.test.tsx`  | Fijar la activación de la query pública por modo.                                  |
| `frontend/src/tests/lib/querySync.test.ts`                   | Fijar freshness, coalescing de vuelos e invalidación forzada.                      |
| `specs/042-dashboard-query-startup-deduplication/evidencia/` | Perfil y comparación de staging antes/después.                                     |
| `.jules/bolt.md`                                             | Añadir resultado medido y próximo cuello.                                          |

## Contratos afectados

Sin cambios: rutas, esquemas Prisma, `swagger.json`, SDK frontend y migraciones.

## Riesgos y rollback

No respetar mismatch de instancia podría dejar visible la caché de otra base; se conserva un camino de invalidación forzada y se cubre con prueba. El flujo kiosk debe seguir sin token ni red tras una carga previa; se valida con E2E offline existente. Revertir solo los archivos de la tabla devuelve el comportamiento anterior.

## Verificación

Comandos: `fnm exec --using=26 -- npm run test:run -- src/tests/hooks/useEmployeesQueryGating.test.tsx src/tests/lib/querySync.test.ts`; `npm run check`; `npm run lint`; `npm run format:check`; `npm run build`; `npm run check:bundle-budget`; `npm run e2e:staging -- --grep 'offline|Dashboard'`; `npm run perf:staging`; raíz `npm run spec:check` y `npm run docs:check`.
