# Spec 013: Empleados en Fastify

- Estado: Implementado y validado localmente
- Fecha: 2026-10-06
- ADR relacionado: [0018](../../docs/adr/0018-fastify-base-migracion-modular.md)
- Ruta posterior: [roadmap](../roadmap-fastify.md)

## Problema

employeeController concentra proyección, transacción de alta, creación de usuario,
auditoría, sincronización de estado y eventos. El candidato Fastify aún no sirve
ninguna de las seis rutas de empleados. Duplicar estas reglas impediría mantener
paridad y elevaría el coste de modificar un caso de uso.

## Alcance

Extraer list/create/update/bulk en aplicación pura con puertos. Express y Fastify
consumen los mismos flujos; EmployeeService conserva repositorio y sincronización.
Migrar también Excel mediante stream tipado compartido, sin adaptar req/res Express.

| Método | Ruta                  | Acceso                                        | Respuesta                          |
| ------ | --------------------- | --------------------------------------------- | ---------------------------------- |
| GET    | /api/employees/kiosk  | Público, activos                              | Array de seis campos, sin PIN      |
| GET    | /api/employees        | Autenticado; Usuario vinculado ve su fila     | Array o data/pagination            |
| POST   | /api/employees        | Supervisor o superior, incluido Reloj_Control | 201 empleado sin PIN               |
| PUT    | /api/employees/:id    | Supervisor o superior                         | 200 empleado sin PIN; 404 si falta |
| POST   | /api/employees/bulk   | Supervisor o superior                         | 200 success/count (legacy)         |
| GET    | /api/employees/export | Supervisor o superior                         | XLSX filtrado, ocho columnas       |

## Criterios de aceptación

- [x] AC1: Seis rutas Fastify reales; guard no vacío exige superficie exacta, acceso y validadores según contrato.
- [x] AC2: Flujos compartidos list/create/update/bulk, strict y consumidores por index.ts; ninguna dependencia HTTP/DB/entorno/reloj global en aplicación.
- [x] AC3: Alta de empleado y usuario opcional utiliza la misma withDirectTransaction; fallo de ensure revierte empleado. Auditoría y eventos de empleado ocurren tras éxito.
- [x] AC4: HTTP y employee:updated nunca incluyen PIN; quiosco expone solo id/name/rut/isPinBlocked/status/area. Mantener sync y scopes legacy.
- [x] AC5: Permisos persistidos, validación de todo el lote, filtros/paginación/delta, conflictos y actualización/archivo conservan comportamiento entre servidores.
- [x] AC6: Excel válido con columnas/filtros y sin PIN; bulk conserva 10 MiB y alta simple 1 MiB. Sin buffering de toda la exportación.
- [x] AC7: RED/GREEN, PostgreSQL aislado, gates backend/frontend, docs/specs/secrets aprobados y resultados con limitaciones.

## Restricciones

Constitución I–V. Sin cutover, cambios Prisma/dependencias ni envíos externos.
El middleware valida pero no sustituye body: conservar area/workdayType/pin y
flags aunque no estén en EmployeeSchema. No estrechar silenciosamente entrada.
Kiosk legacy no valida query; recibe filtro/paginación pero responde array.

## Hallazgos fuera de alcance

ID correlativo tiene carrera, bulk es por chunks no atómico, update/sync no son
atómicos, ensure puede emitir user:updated antes del commit, auditoría update
incluye changes.pin. NumericString y status libre pueden generar 500.
Respuesta de reactivación puede reflejar PIN flags anteriores al sync: mantener
paridad y registrar para cambio explícito posterior. No afirmar seguridad total,
rollback de eventos ni mejora de rendimiento sin pruebas específicas.

## Trazabilidad

Tests: employeeFlows.test.ts, fastifyRouteContracts.test.ts,
holidays-architecture.test.ts y fastify-integration/employees.test.ts.
Docs: roadmap, README, AGENTS, ADR-0018 y result.md.
