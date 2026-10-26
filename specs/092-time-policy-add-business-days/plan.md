# Plan 092: Reutilizar formatter al sumar días de negocio

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Usar como base los tres perfiles de Spec 091, capturados con la imagen que
   staging servía antes de este cambio.
2. Añadir una prueba diferencial que compare la salida de `addBusinessDaysCL`
   con `formatInTimeZone` sobre la misma fecha UTC al mediodía.
3. Cambiar únicamente el formateo final para delegar en
   `formatBusinessDateCL`; preservar las operaciones y entradas actuales.
4. Ejecutar tests, TypeScript, ESLint y comparar un conjunto determinista amplio
   en Node 26.
5. Reconstruir frontend de staging, comprobar salud, capturar tres perfiles y
   cinco corridas Lighthouse; registrar cambios y límites de atribución.
6. Actualizar `.jules/bolt.md`, completar spec y tareas, pasar preflight y crear
   un commit Conventional.

## Archivos a tocar

| Archivo                                    | Cambio                                         |
| ------------------------------------------ | ---------------------------------------------- |
| `frontend/src/utils/timePolicy.ts`         | Reutilizar `formatBusinessDateCL` al retornar. |
| `frontend/src/utils/timePolicy.test.ts`    | Comparar fechas y offsets deterministas.       |
| `specs/092-time-policy-add-business-days/` | Guardar mediciones y resultado.                |
| `.jules/bolt.md`                           | Registrar resultado y siguiente foco.          |

## Contratos afectados

Sin cambios: no afecta APIs, SDK, Prisma ni persistencia.

## Riesgos y rollback

La salida debe seguir reflejando `America/Santiago`. El mediodía UTC se conserva,
y la prueba diferencial compara la fecha resultante con `date-fns-tz`. Rollback:
restaurar la llamada `formatInTimeZone(base, BUSINESS_TZ, "yyyy-MM-dd")`.

## Verificación

```bash
fnm exec --using=26.10.0 -- npm --prefix frontend run test:run -- src/utils/timePolicy.test.ts
fnm exec --using=26.10.0 -- npm --prefix frontend run check
fnm exec --using=26.10.0 -- npm --prefix frontend exec -- eslint src/utils/timePolicy.ts src/utils/timePolicy.test.ts
fnm exec --using=26.10.0 -- npm run staging:up
fnm exec --using=26.10.0 -- npm --prefix frontend run perf:profile:route -- --route=time-control --output=../specs/092-time-policy-add-business-days/evidencia/time-control-production-cpu-after-2026-10-25.json
fnm exec --using=26.10.0 -- npm --prefix frontend run perf:time-control:cold
fnm exec --using=26.10.0 -- npm run preflight
```
