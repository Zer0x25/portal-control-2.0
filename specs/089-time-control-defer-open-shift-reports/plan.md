# Plan 089: diferir informes de turno en Control horario

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Deshabilitar la consulta de informes abiertos al montar el hook de modales.
2. En la acción de agregar novedad, ejecutar `refetch` con error propagado y
   resolver el turno activo con los datos recién recibidos.
3. Mantener el estado del borrador y el aviso cuando la respuesta correcta no
   contiene turnos abiertos; mostrar un error distinto si no se pudo completar
   la solicitud.
4. Verificar el comportamiento del hook, probar la acción desde staging y medir
   tres perfiles de producción y cinco corridas Lighthouse frías en staging.

## Archivos a tocar

| Archivo                                                                  | Cambio                                                               |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `frontend/src/features/time-control/hooks/useTimeControlModals.ts`       | Diferir el fetch de turnos abiertos hasta la acción que lo necesita. |
| `frontend/src/tests/features/time-control/useTimeControlModals.test.ts`  | Cubrir acción con turno, sin turno y error de consulta.              |
| `specs/089-time-control-defer-open-shift-reports/evidencia/`             | Guardar perfil de producción y mediciones Lighthouse anonimizadas.   |
| `specs/089-time-control-defer-open-shift-reports/evidencia/resultado.md` | Registrar resultados y límites de atribución.                        |

## Contratos afectados

Sin cambios: no afecta endpoints, esquemas Prisma, `swagger.json`, SDK ni
migraciones.

## Riesgos y rollback

El riesgo es confundir un fallo de red con la ausencia de turno activo. La
consulta propaga el error y la interfaz muestra un aviso específico; el flujo
se revierte restaurando la consulta habilitada al montar.

## Verificación

- `cd frontend && fnm exec --using=26.10.0 -- npx vitest run src/tests/features/time-control/useTimeControlModals.test.ts`
- `cd frontend && fnm exec --using=26.10.0 -- npm run perf:profile:route -- --route=time-control --output=../specs/089-time-control-defer-open-shift-reports/evidencia/time-control-production-cpu-after-2026-10-25.json`
- `cd frontend && fnm exec --using=26.10.0 -- npm run perf:time-control:cold`
