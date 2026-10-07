# Plan 015: Turnos

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Estrategia

1. Después de gates 014, completar contratos neutrales y pruebas RED.
2. Extraer conversiones, scope y traducción de errores a aplicación con salidas
   genéricas inferidas desde puertos. Mantener servicios vigentes y sus algoritmos.
3. Sustituir shiftController/monthlyShiftController por adaptadores compartidos.
4. Registrar dieciocho rutas con mismos roles/schemas y límites de bulk 10 MiB.
5. Verificar CRUD, planes, fallos, calendario y recorrido conjunto con marcaciones.

## Archivos a tocar

modules/shifts, services/shiftFlows.ts, controllers/shiftController.ts,
controllers/monthlyShiftController.ts, MonthlyShiftService.ts (tipo rest),
app/runtime/routeContracts/tsconfig, tests de flujos/HTTP/BD y docs.

## Contratos y rollback

Sin paths/status/SDK/Prisma nuevos. GET params/query sin schema usan marcador
z.unknown y la validación manual existente en aplicación; no endurecer valores
malformados silenciosamente. DELETE valida params string. Revertir plugin o entrega,
Express sigue principal. No hay migración BD.

## Verificación

Node 26: backend validate:ci, test:coverage, test:fastify:integration. Después de
SDK frontend validate:ci:coverage. Docs/specs/secrets/diff; sin staging/cutover.
BD desechable y correo sustituido para escenario conjunto.

## Deudas registradas para corrección posterior

El endpoint mensual conserva el desplazamiento UTC/Chile y consultas por día del
servicio existente; no trasladar ese patrón a nuevos servicios. Corregir con fechas
Chile y contexto batch en una spec de contrato, antes del cambio principal.
Assignments sin vínculo de Usuario y sin scope de quiosco requieren una decisión
explícita de autorización; la migración mantiene ese comportamiento heredado.
Matriz sin vínculo se rechaza explícitamente con 403 como cambio declarado aquí.
