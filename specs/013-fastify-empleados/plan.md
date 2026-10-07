# Plan 013: Empleados en Fastify

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Estrategia y puertos

Aplicación define filas escalares y repository, transaction, ensureUser, audit,
withoutTriggers, syncStatus y emit. transaction ofrece create y ensure sobre un
mismo cliente directo; aplicación no recibe Prisma.TransactionClient. Composición
traduce a EmployeeService/UserService y ALS conserva actor/skipTrigger. AppError
es la única dependencia externa pura.

Flujos conservan orden: create resuelve ID, transacción, usuario opcional y audit;
update lee anterior, actualiza, audita estado/PIN/cambios, asegura usuario activo
y sincroniza. Bulk delega chunks/audit. Proyecciones explícitas omiten PIN y
conservan campos existentes, incluidos flags/contador para empleado autenticado.

Fastify autentica en onRequest; supervisor usa los mismos cuatro roles. Valida
schemas sin reemplazar body, query GET y params PUT. Kiosk conserva query libre.
Excel usa Writable y PassThrough sin casts Express.Response ni buffer completo.

## Archivos a tocar

| Archivo                                                 | Cambio                                                 |
| ------------------------------------------------------- | ------------------------------------------------------ |
| backend/src/modules/employees/                          | Flujos puros, API pública y plugin HTTP                |
| backend/src/services/employeeFlows.ts                   | Composición Prisma/direct transaction/ALS/audit/socket |
| backend/src/controllers/employeeController.ts           | Express delgado                                        |
| backend/src/services/export/StreamExportService.ts      | Puerto Writable Excel                                  |
| backend/src/utils/httpStream.ts                         | Contrato streaming independiente de Express            |
| backend/src/platform/fastify/app.ts y routeContracts.ts | Registro y guard de seis rutas                         |
| backend/src/fastify/runtime.ts                          | Dependencia real                                       |
| backend/tsconfig.modules.json                           | Strict del módulo                                      |
| backend/tests/unit/employeeFlows.test.ts                | TDD proyecciones/orden/fallos                          |
| backend/tests/fastify-integration/employees.test.ts     | Paridad HTTP, rollback y Excel                         |

## Contratos y rollback

Sin cambio de paths, códigos, payloads, Prisma ni SDK. Express sigue principal.
Retirar registro candidato revierte superficie Fastify; revertir entrega restaura
controller. Sin migración BD. No cambiar atomicidad de update ni auditoría/PIN.

## Verificación

Node 26. Backend validate:ci, test:coverage, test:fastify:integration. Frontend
validate:ci:coverage después de SDK. Raíz docs:check, spec:check, secrets:scan
y git diff --check. PostgreSQL desechable sin usar BD local.
