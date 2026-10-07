# Resultado 017: Reportes de turno

Estado: Implementado y validado localmente. Cambios 017 sin commit.
Spec 016 guardada en 7d2cc1c; 014/015 en 9d8e101. Hooks aprobados, sin push.

## Entrega

Tres rutas Fastify nativas (list/save/export) con flujos Express compartidos.
Aplicación pura strict, puertos neutrales, helpers AppError/toCaughtError puros,
API pública index.ts y manifiesto exacto no vacío. POST conserva 200/ShiftReportSchema
sin reemplazar body; roles persistidos y límite 1 MiB. Controller delgado.

Exportación XLSX conserva algoritmo de StreamExportService, cambiando tipo de
salida a Writable neutral. sendHttpStream sincroniza headers con respuesta nativa
hasta primer byte; exportadores pueden declarar XLSX o JSON tras consulta async.
La prueba de pre-stream error detectó header JSON ausente antes de corregirlo.
No buffer completo en producción, casts a Express.Response, schema/deps/SDK nuevos.

## Evidencia

Tres tests RED antes de implementar (/tmp/portal-017-red.log), luego GREEN: puertos,
actor, conflicto estructurado 409 y wrapper 500 existente. Manifiestos/guard de
imports/strict prueban ausencia/faltantes/extra/auth/validación y efectos prohibidos.
Pre-stream error no cuelga y devuelve JSON 500; oversized 413 antes de save.
Backend validate:ci aprobado: tipos/global/strict, formato, lint 0/0, SDK sin
cambios, nueve tests de schemas y build. Cobertura backend: 364/364 tests en 45 archivos, umbrales conservados.

PostgreSQL desechable: 239/239 tests en doce archivos, incluidos 24 tests de
reportes (doce por servidor). En ambos transportes verifica apertura/bloqueo/cierre,
folio MAX numérico 999/1000→1001, retry de tres creates closed concurrentes, orden
normalizado de novedades/proveedores y auditoría granular add/edit/delete con
actor real. Eventos created/updated contienen respuesta enriquecida. XLSX se
abre y verifica celdas de novedad/proveedor, headers y filename; missing 404 y
corrupto 500 JSON sin colgar. List caracteriza filtros/status/paginación/delta.

Trigger de fallo update comprueba que reporte no cambia ni se emite éxito,
pero audit granular previo persiste: caracteriza falta de atomicidad vigente.
Reloj_Control permitido; sesión ausente 401 y JWT Admin con rol BD Usuario 403
en las tres rutas. No se ensaya exclusividad concurrente de open como garantía.

Frontend validate:ci:coverage aprobado: 276/276 tests en 71 archivos, tipos,
lint/formato/cobertura/build/PWA. Docs (125 Markdown/19 ADR), specs (25), secrets
(0 secretos) y git diff --check aprobados. Validación local, sin CI remoto.

## Límites y deudas

Servicio interno/normalización/auditoría no se reescriben. Id opcional en schema
falla 500 al llegar a findUnique; folio recibido se ignora en alta y se permite
editar. Lookup open incluye eliminados; updates pueden reabrir sin conflicto;
create open no es una transacción exclusiva. MAX/retry protege folio único,
no garantiza un solo abierto. List delta incluye open pero excluye tombstones.

Export lee JSON almacenado directo; JSON corrupto falla pese a normalización de
list. Auditoría de entradas previa a write no es atómica; efectos/eventos no
aseguran entrega de sockets. Helpers conservan mensaje/status inesperados.
Salidas genéricas inferidas conservan payloads sin serializers nuevos; query GET
z.unknown es marcador con conversiones existentes, no schema exhaustivo.

Express principal; sin BD local, staging/PgBouncer/gateway/e2e/carga comparativa,
listeners/jobs/sockets ni despliegue. No se promete mejora de rendimiento.

## Mantenimiento y rollback

Aplicación: modules/shiftReports/application. Composición: services/shiftReportFlows.ts.
HTTP: modules/shiftReports/http y shiftReportController. Stream: StreamExportService
y platform/fastify/stream.ts. Pruebas: shiftReportFlows.test.ts/shiftReports.test.ts.
Revertir módulo/plugin/entrega sin migración BD. Quedan ocho specs 018–025.
Siguiente: KPI (018); deudas se resuelven con contrato explícito antes del cutover.

Logs: /tmp/portal-017-backend-ci.log, /tmp/portal-017-coverage.log,
/tmp/portal-017-integration.log, /tmp/portal-017-green.log,
/tmp/portal-017-frontend-ci.log.
