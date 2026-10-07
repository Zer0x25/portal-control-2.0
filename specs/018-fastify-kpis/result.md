# Resultado 018: KPI

Spec: [spec.md](spec.md). BDD: [behavior.md](behavior.md).

## Entrega

Cuatro rutas nativas; Express comparte los flujos con Fastify. Aplicación pura
inyecta operaciones del motor y política de fechas. APIs públicas, strict y guards
exactos/no vacíos ampliados. Respuestas sin nuevos envelopes; límite 1 MiB.

Cambio de seguridad declarado: overview y kpiDetails.absentEmployees reutilizan
proyección pública de empleados para excluir PIN en ambos servidores.

Commit anterior: 9863d3d (spec 017), hooks aprobados. 018 sin commit.

## Evidencia

RED: cuatro pruebas de orquestación fallaron antes de implementar
(`/tmp/portal-018-red.log`).

- Backend validate:ci aprobado: formato, lint/budget 0/0, types strict, SDK sin
  cambios, nueve pruebas schema y build (`/tmp/portal-018-backend-ci.log`).
- Backend cobertura: 376 pruebas/47 archivos, thresholds vigentes aprobados
  (`/tmp/portal-018-coverage.log`).
- Suite focalizada final: 137 pruebas/5 archivos, incluidos dos casos adicionales
  de body 413 y proyección de ausencia (`/tmp/portal-018-green.log`).
- PostgreSQL desechable: 261 pruebas/13 archivos, 22 KPI (11 por servidor)
  (`/tmp/portal-018-integration.log`), contenedor eliminado.
- Tras retirar cast redundante del motor: check completo, lint focalizado y build
  aprobados (`/tmp/portal-018-final-check.log`, final-lint.log, final-build.log).
- Frontend validate:ci:coverage aprobado: 276 pruebas/71 archivos, types,
  formato, lint/budget, cobertura y build/PWA (`/tmp/portal-018-frontend-ci.log`).
- Raíz docs:check (127 Markdown/19 ADR), spec:check (25 specs), secrets:scan
  (0 secretos) y git diff --check aprobados.

Paridad cubre respuestas vacías, ocho horas de snapshot, filtros, precedencia
exclusiva, límites/rangos/schema, roles persistidos, cache write real fallido,
materialización/reutilización y corrupción. La validación regex de fechas
inexistentes quedó caracterizada, no se endurece silenciosamente.

## Límites y rollback

Motor, schema, dependencias y servidor principal se conservan. GET overview/daily
no materializan caché; POST reportes sí pueden hacerlo. La caché cerrada persiste
sin invalidación automática al cambiar marcajes, con JSON corrupto falla 500.
Cache miss conserva consultas por empleado/mes; no se añade este patrón a aplicación.
Overview/contexto diario mezcla UTC/Chile y contexto solo actual para anomalías
ayer. Cálculo Ausente explícito normaliza estado y puede omitir contadores legacy.
Filtros employeeId/departmentId ignorados; IDs vacíos no restringen; reportes
incluyen archivados y registros soft-deleted heredados. No se garantiza atomicidad
del lote de cachés. No se probaron gateway/PgBouncer, staging/e2e/carga, jobs o sockets.
Revertir el cambio conserva Express como servidor principal; datos de caché
materializados son compatibles con el motor anterior. No se reclama mejora de rendimiento.

Schema de fecha valida formato, no calendario: 2026-02-30 puede devolver 200
en ambos servidores. Caracterizado y pendiente de contrato correctivo antes de cutover.
