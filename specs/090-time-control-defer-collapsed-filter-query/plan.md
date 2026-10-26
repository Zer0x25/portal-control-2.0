# Plan 090: Diferir consulta de filtros colapsados en móvil

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir pruebas de componente para móvil colapsado, móvil expandido y desktop;
   primero confirmar que fallen con la carga incondicional actual.
2. Pasar `enabled: !isMobile || isExpanded` a la consulta auxiliar de
   `TimeRecordFilters`, conservando los parámetros predeterminados de
   `useTimeRecords`.
3. Ejecutar tests, typecheck y lint dirigidos; comprobar que `TimeControl.view`
   y el tamaño de página de la tabla permanezcan intactos.
4. Reconstruir solo el frontend de staging, verificar salud y capturar tres
   perfiles CDP; comparar la cantidad de `/api/records`.
5. Ejecutar cinco Lighthouse frías y documentar las medianas y rangos junto con
   sus límites de atribución.
6. Actualizar `.jules/bolt.md`, correr preflight y crear un commit Conventional.

## Archivos a tocar

| Archivo                                                                 | Cambio                                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `frontend/src/features/time-control/components/TimeRecordFilters.tsx`   | Habilitar el query auxiliar solo si el filtro móvil está visible. |
| `frontend/src/tests/components/time_control/TimeRecordFilters.spec.tsx` | Cubrir enablement móvil y desktop.                                |
| `specs/090-time-control-defer-collapsed-filter-query/`                  | Guardar especificación, mediciones y resultado.                   |
| `.jules/bolt.md`                                                        | Registrar el cambio, mediciones y siguiente foco.                 |

## Contratos afectados

Sin cambios: no afecta endpoints, esquemas Prisma, `swagger.json`, SDK ni
migraciones.

## Riesgos y rollback

La consulta de empleados con registros en el rango se ejecutará al desplegar el
panel en móvil. Mientras permanece colapsado, la lista de resultados de filtros
no se muestra ni se usa. Rollback: quitar `enabled` explícito y recuperar la
carga automática al montar.

## Verificación

```bash
fnm exec --using=26.10.0 -- npm --prefix frontend run test:run -- src/tests/components/time_control/TimeRecordFilters.spec.tsx
fnm exec --using=26.10.0 -- npm --prefix frontend run check
fnm exec --using=26.10.0 -- npm --prefix frontend run perf:profile:route -- --route=time-control --output=../specs/090-time-control-defer-collapsed-filter-query/evidencia/time-control-production-cpu-after-2026-10-25.json
fnm exec --using=26.10.0 -- npm --prefix frontend run perf:time-control:cold
fnm exec --using=26.10.0 -- npm run preflight
```
