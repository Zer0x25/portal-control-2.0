# Plan 014: Marcaciones

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Estrategia

1. Puertos service/clock/businessDate/context/audit/emit y entradas neutrales.
2. Extraer orchestration del controller sin mover transacciones/algoritmos existentes.
3. Separar PunchService de AuthRequest con principal mínimo. Conservar sus efectos.
4. Adaptador Fastify nueve rutas, mismos schemas sin reemplazo de entrada.
5. Extraer helper de stream Fastify reutilizable; estrechar tres métodos export a Writable.
6. TDD, paridad PostgreSQL y validación independiente antes de spec 015.

## Archivos a tocar

modules/records, services/recordFlows.ts, timeRecordController.ts, PunchService.ts,
StreamExportService.ts, utils/httpStream.ts, platform/fastify/stream.ts,
app.ts/routeContracts.ts/runtime.ts, tsconfig.modules.json y tests.

## Contratos y rollback

Paths/status/output/schema Prisma/SDK se conservan. El puerto de punch admite
objeto user mínimo compatible con callers existentes; sin request Express en runtime.
Retirar plugin candidato o revertir entrega; sin migración BD.

## Verificación

Node 26: backend validate:ci/test:coverage/test:fastify:integration. Después de SDK,
frontend validate:ci:coverage; raíz docs:check/spec:check/secrets:scan/diff --check.
Proveedores de correo sustituidos en tests; ninguna notificación real.
