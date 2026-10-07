# Plan 023: Mantenimiento y administración

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Implementación

1. Inventario 12 admin + 9 maintenance; cuatro RED y BDD.
2. modules/admin y modules/maintenance con contratos/flows puros e index público.
3. services/adminFlows.ts y maintenanceFlows.ts componen servicios vigentes,
   watchdog, ALS y runtime. Controllers delgados comparten flujos.
4. Schemas admin movidos sin cambio; plugins nativos; progressStream y helper
   Express JSON por líneas. Conservar compresión/exclusiones/presupuesto admin.
5. Integración aislada, guards exactos, strict y gates; publicar resultado.

## Gates

Backend validate:ci, test:coverage y test:fastify:integration. Tras SDK y backend,
frontend validate:ci:coverage. Raíz docs:check, spec:check, secrets:scan y diff check.
No staging, procesos backup/restore/restart reales ni cambios Prisma/dependencias.

## Rollback

Revertir 023 completo restaura controllers, schemas y configuración HTTP anterior,
retira registros/guards nativos, sin migraciones DB. Express continúa principal.
Cambiar solo el plugin requiere ajustar el guard exacto. Cutover se reserva a 025;
024 debe revisar jobs/background, sockets, entrypoint y restart.
