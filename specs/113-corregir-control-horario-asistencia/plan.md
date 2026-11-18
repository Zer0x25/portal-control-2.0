# Plan 113: Corrección de control horario y asistencia

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Reproducir primero con pruebas los errores de integridad de rango y atomicidad del lote; obtener el predecesor real por cadena en el orden de sellado y persistir el lote y su auditoría como una unidad transaccional, sin cambiar datos anteriores.
2. Unificar o compartir la lógica del cierre del endpoint y job si la inspección lo permite, manteniendo sus efectos autorizados; bloquear por empleado, volver a leer y comprobar elegibilidad dentro de la transacción, sellar y auditar una sola vez. Verificar carrera de salida y cierres duplicados.
3. Definir una fuente completa para opciones y una representación común de filtros y alcance en listado y exportaciones. Obtener el conjunto completo para impresión sin depender de páginas cargadas y manejar explícitamente límites/errores.
4. Ajustar estados de carga/error de la consola, fuente completa de indicadores de edición y frontera de cierre. Integrar la novedad en la bitácora persistente del turno abierto vinculado a la jornada. Aplicar en backend y UI la política aprobada de Supervisor, conservando su capacidad de resolver correcciones.
5. Sincronizar contratos HTTP/SDK cuando corresponda, probar roles, múltiples páginas y escritorio/móvil, documentar resultados y ejecutar validaciones.

## Archivos a tocar

| Archivo o área                                                                                      | Cambio previsto                                                                                                              |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/services/timeRecordIntegrityService.ts`                                                | Verificación por predecesor real y límite contractual.                                                                       |
| `backend/src/services/TimeRecordService.ts`, `backend/src/services/autoCloseService.ts`             | Atomicidad, sellado y revalidación de cierre.                                                                                |
| `backend/src/modules/records/application/flows.ts`, rutas/esquemas y `backend/src/services/export/` | Filtros completos, auditoría y contrato HTTP.                                                                                |
| `frontend/src/features/time-control/` y componentes/hooks relacionados                              | Opciones, exportación/impresión, estado de consola, indicadores, novedad y cierre. Confirmar rutas precisas antes de editar. |
| `backend/tests/`, `frontend/src/tests/`, `frontend/e2e/`                                            | Regresiones de servicios, HTTP y UI.                                                                                         |
| `docs/flows/control-horario-y-asistencia.md`                                                        | Evidencia y estado tras comprobar cada resultado.                                                                            |

## Contratos afectados

Revisar `GET /api/records/integrity/verify`, `POST /api/records/bulk`, cierres, listado y `GET /api/records/export`: conservar compatibilidad y aplicar alcance de usuario. Si se modifican esquemas/rutas, seguir `api-contracts-sync` y regenerar Swagger/SDK. Investigar el modelo de bitácora y evaluar explícitamente cualquier migración necesaria para vincular la novedad con la jornada. Las transacciones interactivas y bloqueos usan `withDirectTransaction`.

## Riesgos y rollback

Lotes grandes pueden incrementar tiempo de transacción: comprobar límites existentes y rechazar explícitamente si es necesario, sin dividir la atomicidad. Exportaciones completas pueden requerir procesamiento por lotes internos sin omitir filas ni alterar filtros. Concurrencia y efectos secundarios requieren pruebas con PostgreSQL aislado; correo debe producirse solo para cierres confirmados. Revertir código y contratos conjuntamente; no borrar ni reescribir datos de producción. Si cambia algún esquema, preparar rollback y respaldo antes de aplicar migraciones.

## Verificación

Pruebas focalizadas de Vitest y Fastify inject con PostgreSQL aislado, carreras sincronizadas, comparación de archivos y flujo de navegador escritorio/móvil. Después `npm run spec:check`, `npm run docs:check`, `npm run lint:budget`; en backend y frontend ejecutar `npm run check`, `npm run lint`, `npm run validate:ci`; ejecutar `npm run check:sdk` en backend si se afecta contrato. Registrar los límites de lo realmente ejecutado.
