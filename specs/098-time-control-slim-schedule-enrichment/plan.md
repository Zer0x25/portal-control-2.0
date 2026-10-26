# Plan 098: simplificar el enriquecimiento de turnos de Control horario

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

Cómo se implementa en 3-6 pasos. Sin código, solo decisiones técnicas.

1. Capturar en la imagen staging vigente cinco corridas Lighthouse frías y tres
   perfiles CPU; guardar JSON y hashes como línea base.
2. Extraer el cálculo de `EmployeeDailyScheduleInfo` a un hook compartido que
   conserve el mismo orden de precedencia y datos de entrada.
3. Crear un hook de enriquecimiento que solo monte las queries de patrones,
   asignaciones, feriados y permisos; cambiar `useTimeControl` para usarlo.
4. Agregar pruebas de no montaje de observers ajenos y equivalencia funcional;
   ejecutar pruebas focalizadas y reconstruir solo frontend de staging.
5. Repetir Lighthouse, perfiles CPU y la batería funcional; mantener el código
   solo si cumple AC3 y AC4, de lo contrario revertirlo y registrar el descarte.

## Archivos a tocar

| Archivo                                                                        | Cambio                                                          |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Archivo                                                                        | Cambio                                                          |
| -------                                                                        | ------                                                          |
| `frontend/src/hooks/useScheduling.ts`                                          | Reutilizar el cálculo diario compartido sin cambiar resultados. |
| `frontend/src/hooks/useEmployeeDailyScheduleLookup.ts`                         | Compartir mapas memoizados y cálculo diario.                    |
| `frontend/src/features/time-control/hooks/useTimeControlScheduleEnrichment.ts` | Consultar solo los cuatro datasets requeridos.                  |
| `frontend/src/features/time-control/hooks/useTimeControl.ts`                   | Consumir el hook enfocado.                                      |
| Tests de `useScheduling` y Control horario                                     | Verificar equivalencia y ausencia de observers ajenos.          |
| `specs/098-.../evidencia/` y `.jules/bolt.md`                                  | Conservar mediciones antes/después y decisión.                  |

## Contratos afectados

Ninguno. No cambian rutas HTTP, esquemas Prisma, `swagger.json`, SDK ni
migraciones.

## Riesgos y rollback

Puede cambiar la precedencia aplicada a permisos, feriados y asignaciones, o
dejar de mostrar el turno de un empleado sin perfil cargado. Las pruebas
caracterizan cada rama antes de la extracción. Si falla una equivalencia, una
request HTTP o el umbral Lighthouse, restaurar `useScheduling` en
`useTimeControl.ts`; eliminar la abstracción compartida solo si ya no tiene
consumidores.

## Verificación

```bash
fnm exec --using 26.10.0 -- npm --prefix frontend run test:run -- src/tests/hooks/useSchedulingQueryGating.test.tsx src/tests/features/time-control/useTimeControl.test.ts src/tests/features/time-control/useTimeControlScheduleEnrichment.test.ts
fnm exec --using 26.10.0 -- npm --prefix frontend run check
fnm exec --using 26.10.0 -- npm --prefix frontend run perf:time-control:cold
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api fnm exec --using 26.10.0 -- npm --prefix frontend run perf:profile:route -- --route=time-control --output=../specs/098-time-control-slim-schedule-enrichment/evidencia/time-control-production-cpu-after.json
fnm exec --using 26.10.0 -- node .agents/skills/ci-preflight/scripts/preflight.cjs
```
