# Plan 022: Auditoría

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Implementación

1. Inventario de seis rutas y deudas; BDD y cuatro casos RED.
2. modules/audit/application/contracts.ts y flows.ts puros; index.ts público.
3. services/auditFlows.ts compone servicios existentes; auditExport.ts mueve SQL
   parametrizado vigente. StreamExportService recibe puerto Writable para CSV/XML.
4. Controller Express delgado, plugin Fastify nativo, runtime y guard de seis rutas.
5. Pruebas HTTP con BD aislada, incluyendo concurrencia ALS/direct transaction.

## Verificación

Backend: validate:ci, test:coverage y test:fastify:integration. Frontend después
de check:sdk: validate:ci:coverage. Raíz: docs:check, spec:check, secrets:scan.
No cambios Prisma, nuevas dependencias ni schema SDK. Sin staging/carga ni cutover.

## Rollback

Revertir el cambio 022 completo devuelve el controller anterior y retira el plugin
sin migraciones BD ni cambios de servidor principal. Retirar solo el registro exige
retirar también el contrato nativo correspondiente. No tocar contenedores locales.
