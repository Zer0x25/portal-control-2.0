# Plan 024: Runtime integrado

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Implementación

- modules/runtime/application/lifecycle.ts: timers y tareas por puertos; index.ts público.
- services/runtimeJobs.ts: composición compartida de locks, telemetría, horarios y retries.
- services/schedulerService.ts: un ciclo nocturno, refresh de reportes sin duplicados,
  seguimiento de ejecuciones y stopScheduler. Autocierre se ejecuta solo en runner 5 min.
- services/seedingJobService.ts: seguimiento de workers/operaciones, shutdown por frontera
  de chunk sin finalizar como completed; openRuntime al inicio. Sin cambiar motor/SQL.
- services/socketService.ts: propietario único y close; misma política legacy de conexión.
- services/runtimeHost.ts y runtimeControlService.ts: señales y restart tras cierre.
- fastify/integrated.ts/main.ts e index.ts: listener único, arranque y recursos compartidos.
- utils/openapi.ts/swagger.ts: generación sin Express y adaptador principal.
- platform/fastify/app.ts: JSON vacío compatible con Express, parser nativo
  seguro para JSON no vacío y límites originales.
- load/run-staging.cjs/staging-read.cjs/staging-read.yaml: renovación fuera de VUs,
  token privado, cierre y ensure moderno no vacuo.
- platform/fastify/docs.ts, Dockerfile: artefacto OpenAPI en dist y UI instalada local.
- compose.fastify-staging.yaml: override opt-in; base y producción siguen Express.
- compose.yaml/compose.staging.yaml: AUTH_TYPE SCRAM explícito para PgBouncer,
  corrección del fallo reproducido en el ensayo.
- nginx/conf.d/default.conf: proxy documentación; rutas API/socket conservadas.

## Pruebas

RED: runtimeLifecycle.test.ts falla porque el módulo público aún no existe, registrado
antes de implementación en /tmp/portal-024-red.log. GREEN: lifecycle, runtimeHost,
schedulerLifecycle y runtimeJobs prueban drain, errores, señales, timers, locks y fase2.
Guard de arquitectura runtime incluye aplicación no vacía y imports públicos.
PG: tests/fastify-integration/runtime.test.ts usa listener real, polling/websocket,
Swagger y persistencia del worker con operación diferida; demás specs regresión.

Backend validate:ci y coverage, integración PG desechable. Frontend
validate:ci:coverage después de SDK. Raíz docs:check, spec:check, secrets:scan.
Ensayo staging en proyecto propio portal-024-rehearsal con secretos aleatorios,
BD y volúmenes nuevos; e2e y carga por gateway. No usar BD local ni correo real.

## Rollback

Express sigue principal. Omitir override compose.fastify-staging.yaml recupera el
entrypoint principal. Ambos entrypoints comparten runner; revertir commit 024 recupera
la implementación previa. No hay migración de esquema ni cambio de dependencias.
Ensayar cierre/reinicio del candidato y vuelta a Express en el staging propio.
