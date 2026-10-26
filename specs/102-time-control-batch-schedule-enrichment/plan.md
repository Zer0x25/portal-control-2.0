# Plan 102: Enriquecimiento de turnos por página en Control horario

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Reprobar primero los casos HTTP de inclusión/exclusión de empleados
   inactivos; agregar `includeInactive` opcional y exigir IDs cuando se solicita.
2. Sincronizar OpenAPI y SDK. Extender la clave canónica de matriz de forma que
   las consultas del calendario mantengan su clave existente y la variante con
   inactivos use una clave distinta.
3. Reemplazar en Control horario las cuatro queries de catálogos por queries
   de matriz separadas por página. Cada cuerpo lleva IDs únicos ordenados,
   fechas mínima/máxima e `includeInactive: true`; una página nueva dispara solo
   su propia query acotada.
4. Probar la paridad activa/inactiva, reconstruir frontend de staging y comparar
   perfiles y Lighthouse con Spec 100, misma semilla y configuración.
5. Conservar runtime solo si pasan los gates de AC4. En caso contrario,
   revertir runtime y mantener evidencia de la decisión.

## Archivos a tocar

| Archivo                                                                             | Cambio                                                               |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `backend/src/models/schemas/shift.schemas.ts`                                       | Aceptar `includeInactive` opcional y validar IDs cuando se solicita. |
| `backend/src/modules/shifts/application/contracts.ts`                               | Extender el input tipado de matriz.                                  |
| `backend/src/modules/shifts/application/flows.ts`                                   | Propagar la opción sin alterar el recorte self-only.                 |
| `backend/src/services/schedulingService.ts`                                         | Omitir filtro de estado solo con IDs explícitos y opción `true`.     |
| `backend/tests/fastify-integration/shifts.test.ts`                                  | Probar activos, inactivos, cuerpo vacío y autorización.              |
| `backend/src/platform/openapi/operations.ts`                                        | Documentar la opción de request.                                     |
| `backend/docs/swagger.json`                                                         | Artefacto OpenAPI generado.                                          |
| `frontend/src/types/api-schema.ts`                                                  | SDK regenerado.                                                      |
| `frontend/src/lib/queryKeys.ts`                                                     | Clave distinta para matriz que incluye inactivos; preservar default. |
| `frontend/src/hooks/queries/useCalendarMatrixQuery.ts`                              | Compartir opciones/cliente de la matriz.                             |
| `frontend/src/features/time-control/hooks/useTimeControlScheduleEnrichment.ts`      | Crear queries acotadas por página y mapear respuesta.                |
| `frontend/src/features/time-control/hooks/useTimeControl.ts`                        | Enviar páginas cargadas al hook de enriquecimiento.                  |
| `frontend/src/tests/features/time-control/useTimeControlScheduleEnrichment.test.ts` | Probar IDs/fechas, páginas e información retornada.                  |
| `specs/102-time-control-batch-schedule-enrichment/evidencia/`                       | Capturas CPU/Lighthouse y comparación.                               |
| `.jules/bolt.md`                                                                    | Registrar resultado y siguiente hotspot.                             |

## Contratos afectados

Se amplía el cuerpo validado de `POST /api/shifts/schedule/matrix` con
`includeInactive?: boolean`. `false` mantiene el comportamiento activo actual;
`true` requiere y limita la consulta a `employeeIds`. Regenerar
`backend/docs/swagger.json` y `frontend/src/types/api-schema.ts` mediante el
skill `api-contracts-sync`. No cambia respuesta, ruta, Prisma ni SDK de negocio.

## Riesgos y rollback

- La respuesta agrupada podría pesar más o tardar más que los cuatro catálogos;
  AC4 compara bytes, TBT y LCP y descarta el runtime si falla.
- Debe conservarse el horario de trabajadores inactivos con registros
  históricos; el test de ruta lo fija antes de integrar el hook.
- Las páginas infinitas no deben generar una matriz global: cada query queda
  limitada a un máximo actual de 30 filas, sus IDs y su rango de fechas.
- Si cambian reglas de calendario, compararlas contra los tests del lookup
  anterior antes de aceptar diferencias.
- Rollback: restaurar el hook anterior y retirar solo el campo opcional; la
  matriz predeterminada para el calendario no cambia.

## Verificación

```bash
fnm exec --using 26.10.0 -- npm run spec:check
fnm exec --using 26.10.0 -- npm --prefix backend exec -- vitest run --project integration tests/fastify-integration/shifts.test.ts
fnm exec --using 26.10.0 -- npm --prefix frontend exec -- vitest run --project jsdom src/tests/features/time-control/useTimeControlScheduleEnrichment.test.ts src/tests/features/time-control/useTimeControl.test.ts
fnm exec --using 26.10.0 -- npm --prefix backend run docs:generate
fnm exec --using 26.10.0 -- npm --prefix frontend run sdk:generate
fnm exec --using 26.10.0 -- npm --prefix backend run check:sdk
fnm exec --using 26.10.0 -- npm --prefix backend run check
fnm exec --using 26.10.0 -- npm --prefix frontend run check
fnm exec --using 26.10.0 -- npm --prefix backend run lint
fnm exec --using 26.10.0 -- npm --prefix frontend run lint
fnm exec --using 26.10.0 -- npm run preflight
fnm exec --using 26.10.0 -- npm --prefix frontend run perf:time-control:cold
fnm exec --using 26.10.0 -- npm --prefix frontend run perf:profile:route -- --route=time-control --output=../specs/102-time-control-batch-schedule-enrichment/evidencia/time-control-production-cpu-after-2026-10-25.json
```

## Resultado de ejecución

Se ejecutó la comparación prevista. El candidato redujo 12→9 requests API y
2.758 B de transferencia de catálogos, sin errores funcionales; Lighthouse
reportó LCP mediano +6,69% (gate +5%), por lo que se revirtió el runtime y se
retuvo solo la evidencia. Detalle: [`evidencia/resultado.md`](./evidencia/resultado.md).
