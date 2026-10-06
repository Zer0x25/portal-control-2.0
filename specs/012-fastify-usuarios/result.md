# Resultado — Spec 012

Estado: Implementado, validado localmente; sin push ni deploy.

## Entrega

Fastify agrega GET/POST /api/users y PUT/DELETE /api/users/:id. Las cuatro
requieren autenticación con sesión/rol persistido y permisos Administrador antes
de efectos; inputs usan validadores Zod compartidos y salida UserSchema estricto.
El manifest exige exactamente las cuatro rutas, autenticación y validación con
comprobaciones no vacuas. Express permanece como servidor principal.

Los flujos list/create/update/delete son compartidos, puros y estrictos. Inyectan
repositorio, hash, identificador, auditoría y eventos; solo producen proyecciones
públicas y tombstones. UserService queda como fachada y adaptador Prisma con
select positivo y cliente extendido auditado. Preserva ensureEmployeeUser con su
cliente transaccional y forceResetPassword para sus consumidores actuales.

No cambia el esquema PostgreSQL ni las dependencias. Conserva filtros, rol con
espacios, paginación/metadata, vínculo/desvínculo, contraseñas, flags, conflictos,
404 y 204. HTTP y eventos siguen omitiendo secretos y contadores MFA. Conserva
id y flags históricos aceptados por el servicio aunque no estén documentados
en los schemas de entrada, porque Express valida sin reemplazar el cuerpo.

## Validación

- TDD: cuatro pruebas nuevas fallaron antes de implementar createUserFlows; registro `/tmp/portal-012-red.log`. Luego se ampliaron a seis pruebas de flujos.
- Backend `validate:ci`: formato, lint 0/0, tipos generales y módulos strict, SDK sin cambios, nueve pruebas de schemas y build aprobados (`/tmp/portal-012-backend-ci.log`).
- Backend `test:coverage`: 289 pruebas, 40 archivos, aprobado; ratchets intactos (`/tmp/portal-012-coverage.log`). Cobertura global: 24,70% líneas, 31,38% funciones, 18,38% ramas y 24,21% statements.
- PostgreSQL 18.4 desechable: 61 pruebas, siete archivos, aprobado (`/tmp/portal-012-integration.log`). Usuarios aporta 24 escenarios: 22 HTTP divididos entre Express/Fastify y dos comprobaciones de ensure con BD. Incluye ausencia de autenticación, rol persistido sin permisos, inputs inválidos, filtros, contraseña usable, overrides, DTO/socket seguros, duplicados, 404, borrado y auditoría explícita con actor.
- Auditoría y sockets se comprueban en BD y en SocketService.emit; no se inicia un cliente WebSocket. Auditoría automática Prisma y explícita del servicio se conservan.
- Frontend `validate:ci:coverage`: 276 pruebas, 71 archivos, aprobado; tipos, formato, lint 0/0, cobertura y Vite/PWA build (`/tmp/portal-012-frontend-ci.log`). Ejecutado después de terminar backend/SDK.
- Docs: 75 markdown y 19 ADR indexados; specs: 12; scanner: cero secretos reales y 27 coincidencias permitidas. `git diff --check` aprobado.

## Mantenimiento y desarrollo con agentes

| Cambio futuro                          | Archivos de producción principales                       | Verificación dirigida                    |
| -------------------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| Regla de alta, contraseña o evento     | application/flows.ts                                     | userFlows.test.ts, public-users.test.ts  |
| Consulta SQL, select o relación Prisma | services/UserService.ts                                  | users.test.ts contra PostgreSQL          |
| Contrato HTTP                          | users/http/routes.ts y adaptador Express/schema afectado | Ambos transportes con BD, manifest y SDK |
| Campos públicos                        | application/publicUser.ts y schema compartido            | DTO seguro, sockets y contrato           |

UserService pasa de 339 a 246 líneas. Se añaden flujos de 142 líneas y adaptador
Fastify de 86 líneas: aumenta el código total durante la coexistencia temporal,
a cambio de poder cambiar reglas y probarlas sin dependencia de framework/BD.
No se midió rendimiento de usuarios ni se afirma mejora de latencia por esta
extracción. El benchmark existente de feriados no representa este módulo.

## Límites y próximos pasos

El delta sigue filtrando createdAt; numericString acepta NaN y valores no
positivos, que pueden terminar en errores de persistencia o paginación inválida.
Una primera comprobación confirmó que page=abc no retorna 400 en ninguno de los
dos servidores. Corregirlos requiere un cambio explícito del contrato con BDD;
no se corrigieron silenciosamente durante esta migración. La auditoría posterior
a persistencia tampoco se vuelve atómica ni reintenta eventos en esta entrega.

Sin migración nueva: para una BD existente sigue siendo necesaria la migración
MFA de spec 010. No se aplicaron migraciones a la BD local del usuario; solo al
PostgreSQL desechable de pruebas. No se ejecutaron staging/PgBouncer/gateway,
e2e completo, nuevo build Docker, carga de usuarios ni CI remoto.

Siguiente módulo propuesto: empleados, conservando su transacción de alta y la
creación/reuso de cuenta vinculada. Luego completar módulos restantes, sockets,
jobs, fuente OpenAPI y validación staging antes del cambio definitivo de servidor.
