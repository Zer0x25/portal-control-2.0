# Resultado 014: Marcaciones

Estado: Implementado y validado localmente. Sin commit, push ni deploy.

## Entrega y evidencia

Nueve rutas Fastify nativas y orquestación compartida con Express. Puertos neutrales,
strict, consumers index.ts y guard exacto no vacío. PunchService deja de depender
de AuthRequest: solo recibe user.username, compatible con callers existentes.

RED: cuatro pruebas fallaron con stub antes de implementar flujos
(/tmp/portal-014-red.log). Backend validate:ci aprobado (formato/lint 0/0,
strict/SDK sin cambios/schemas 9/build). Cobertura: 318/318 tests, 42 archivos.
PostgreSQL desechable: 119/119 tests, nueve archivos; 32 de marcaciones (16 por
servidor) para CRUD, scopes, locks, concurrent punch, integridad, bulk y exports.
Frontend: 276/276 tests en 71 archivos, tipos/lint/formato/build/PWA aprobados.
CSV/XML/XLSX ejecutan cursores reales y Excel se abre para comprobar contenido.

Composición conserva withDirectTransaction, advisory lock y hash de integridad.
El test de cinco entradas concurrentes confirma una fila y un evento de punch
exitoso. Fechas del lote completo se comprueban antes de writes; no se trunca
validación a primeras filas. Exportación reutiliza puertos Writable y PassThrough.
Runtime cierra el pool de exportaciones si lo cargó, además de los pools de DB.

## Límites

No se extraen internamente los algoritmos de TimeRecordService/PunchService:
la aplicación migra orquestación y HTTP. Las salidas genéricas conservan tipos
inferidos en composición y payloads legacy; no se incorporan serializers nuevos
que recorten campos ni se garantiza schema estricto de todas las respuestas.

Periodo contable se valida antes del servicio; errores de esa consulta siguen
fail-open heredado. Audit de punch/export y aviso de atraso mantienen tareas sin
await. EmailService.notifyTardiness está sustituido en pruebas; sin envíos reales.
Coordenadas cero y Kiosk_Employee siguen reglas legacy. Eventos se emiten antes
de respuesta HTTP desde flujos (antes inmediatamente después de res.json).

No staging/PgBouncer, gateway, e2e completo, listeners/jobs, carga comparativa ni
entrega de sockets a clientes. BD local no modificada; sin schema/deps nuevos.

## Mantenimiento y rollback

Aplicación: modules/records/application. Composición: services/recordFlows.ts.
HTTP: modules/records/http y timeRecordController. Export: StreamExportService
y platform/fastify/stream.ts. Pruebas: recordFlows.test.ts y records.test.ts.
Revertir plugin/entrega; Express sigue principal, sin migración de BD.

El [cierre conjunto 014/015](../015-fastify-turnos/result.md) amplía la suite a
333 pruebas backend y 175 PostgreSQL, e incluye límites 1/10 MiB, docs/specs/secrets.

Logs: /tmp/portal-014-backend-ci.log, /tmp/portal-014-coverage.log,
/tmp/portal-014-integration.log, /tmp/portal-014-frontend-ci.log.
