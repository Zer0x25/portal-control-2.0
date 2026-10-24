# Plan 063: Defer User Directory For Shift Handover

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Agregar opciones `enabled` opcionales a `useReportsQuery` y `useUsersQuery`, manteniendo activación actual por defecto para los consumidores directos.
2. En `useLoginAutomations`, detectar el rol elegible y la marca de sesión, esperar el resultado de informes y buscar el último cierre antes de activar la query del directorio.
3. Hacer que `useEmployees` mantenga el query de usuarios deshabilitado para sus consumidores generales y lo refresque explícitamente al archivar antes de buscar una cuenta vinculada.
4. Conservar el username del informe como fallback y evitar pedir el directorio a roles que el endpoint no autoriza.
5. Cubrir el estado del traspaso y el archivado; ampliar el probe para guardar solo bytes de `/api/users` y presencia booleana de cierre.
6. Medir el mismo probe de tres contextos en staging antes y después, reconstruir frontend, guardar evidencia y comprobar salud.

## Archivos a tocar

| Archivo                                                                                                                                                         | Cambio                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `frontend/src/hooks/queries/useReportsQuery.ts`                                                                                                                 | Permitir desactivar el query desde automatizaciones sin afectar consumidores existentes.          |
| `frontend/src/hooks/queries/useUsersQuery.ts`                                                                                                                   | Permitir habilitar la query solo cuando el handover necesita un nombre.                           |
| `frontend/src/hooks/useUsers.ts`                                                                                                                                | Propagar la opción de habilitación y exponer el refetch explícito ya disponible en React Query.   |
| `frontend/src/hooks/useEmployees.ts`                                                                                                                            | Evitar la lista global al leer empleados; cargar usuarios solo durante archivado.                 |
| `frontend/src/hooks/useLoginAutomations.ts`                                                                                                                     | Esperar informes, resolver usuario bajo demanda y mantener fallback/guardado de sesión correcto.  |
| `frontend/src/tests/hooks/useLoginAutomations.test.tsx`, `useReportsQuery.test.tsx`, `useEmployeesQueryGating.test.tsx`, `useEmployeesArchiveLazyDate.test.tsx` | Probar roles, gates, ausencia de cierre, cierre pendiente/fallback y carga explícita al archivar. |
| `frontend/e2e/performance.spec.ts`                                                                                                                              | Capturar bytes de usuarios y solo la presencia booleana de cierre.                                |
| `specs/063-defer-user-directory-for-shift-handover/evidencia/*`, `.jules/bolt.md`                                                                               | Registrar baseline y comparación final sin cuerpos ni datos PII.                                  |

## Contratos afectados

No cambia HTTP, OpenAPI, Swagger, SDK ni esquema de base de datos. Los parámetros `enabled` pertenecen a hooks locales; las opciones por defecto de los consumidores actuales se conservan.

## Riesgos y rollback

El principal riesgo es omitir o retrasar el modal si la marca de sesión se guarda antes de que el query de informes termine, o no eliminar una cuenta vinculada al archivar. El efecto solo completará la marca tras un resultado o error terminal; si un cierre existe, esperará el nombre cuando el rol tenga permiso, y usará el username del informe ante error o falta de permiso. El archivado ejecutará `refetchUsers()` antes de buscar la cuenta. Rollback: volver a `useUsers()` sin gate en `useEmployees` y restaurar la activación previa de informes.

## Verificación

```bash
fnm exec --using=26.10.0 -- npm --prefix frontend run test:jsdom -- src/tests/hooks/useLoginAutomations.test.tsx src/tests/hooks/useReportsQuery.test.tsx src/tests/hooks/useEmployeesQueryGating.test.tsx src/tests/hooks/useEmployeesArchiveLazyDate.test.tsx
fnm exec --using=26.10.0 -- npm --prefix frontend run check
fnm exec --using=26.10.0 -- npm --prefix frontend run lint
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
docker compose --env-file .env.staging -f compose.staging.yaml up --build -d frontend
PERFORMANCE_RESULTS_DIR=../specs/063-defer-user-directory-for-shift-handover/evidencia fnm exec --using=26.10.0 -- npm --prefix frontend run e2e:staging -- --project=perf --no-deps --grep 'Time Control initial sync records phase timings and remains blocking'
```
