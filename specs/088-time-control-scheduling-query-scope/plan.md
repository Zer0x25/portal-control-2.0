# Plan 088: limitar consultas de useScheduling en Control horario

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Extender `useScheduling` con modos `full` (predeterminado),
   `schedule-enrichment` y `correction-requests`; los hooks conservan el orden y
   reciben flags `enabled` según el modo. El último limita el hook que alimenta
   las solicitudes pendientes de la tabla.
2. En `schedule-enrichment`, mantener patrones, asignaciones, feriados y
   permisos; deshabilitar configuraciones, empleados y solicitudes de
   corrección. En `correction-requests`, mantener solo la consulta de
   correcciones. El cálculo diario acepta ausencia de empleado cuando se usa la
   proyección de marcación.
3. Seleccionar el modo mínimo solo en `useTimeControl`; comprobar los modos en
   pruebas unitarias y preservar explícitamente el modo completo en otros
   consumidores.
4. Reconstruir solo frontend de staging, confirmar identidad de backend y
   comparar tres perfiles CDP y Lighthouse contra las evidencias de Specs 085,
   086 y 087.

## Archivos a tocar

| Archivo                                                                    | Cambio                                                               |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `frontend/src/hooks/useScheduling.ts`                                      | Definir modos de consulta sin saltarse hooks.                        |
| `frontend/src/hooks/useCorrectionRequests.ts`                              | Permitir elegir el modo de consultas conservando `full` por defecto. |
| `frontend/src/features/time-control/hooks/useTimeControl.ts`               | Activar modo mínimo.                                                 |
| `frontend/src/features/time-control/hooks/useTimeRecordTableController.ts` | Usar modo exclusivo de correcciones.                                 |
| `frontend/src/tests/hooks/useSchedulingQueryGating.test.tsx`               | Cubrir flags por modo y modo completo predeterminado.                |
| `frontend/src/tests/features/time-control/useTimeControl.test.ts`          | Comprobar el modo elegido por Control horario.                       |
| `specs/088-time-control-scheduling-query-scope/`                           | Conservar especificación y evidencia comparativa.                    |
| `.jules/bolt.md`                                                           | Registrar hallazgo, delta observado y siguiente experimento.         |

## Contratos afectados

Ninguno. Solo cambia el `enabled` de hooks de consulta existentes en una ruta.
No hay rutas, schemas, Prisma, `swagger.json`, SDK ni migraciones afectados.

## Riesgos y rollback

Una pantalla que llegara a depender de datos auxiliares de `useScheduling` en el
modo mínimo vería los defaults/colecciones vacías. El modo se limita al único
callsite de Control horario, que solo consume el callback diario. Revertir el
modo de ese callsite vuelve al comportamiento actual.

## Verificación

```bash
cd frontend
fnm exec --using=26.10.0 -- npx vitest run src/tests/hooks/useSchedulingQueryGating.test.tsx src/tests/features/time-control/useTimeControl.test.ts
fnm exec --using=26.10.0 -- npm run check
cd ..
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
git diff --check
```

Las capturas de rendimiento comparan tres muestras con la misma ruta, viewport,
CPU 4x y backend local; verificar que el único contenedor reconstruido sea el
frontend. Guardar source maps en build `node:26-alpine` y cotejar los 208 scripts
con staging antes de perfilarlos.
