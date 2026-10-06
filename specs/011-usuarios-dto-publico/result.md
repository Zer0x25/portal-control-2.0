# Resultado — Spec 011

Estado: Implementado — validado localmente.

## Cambio y contrato

Todas las salidas UserService usan una proyección explícita común de nueve campos:
id, username, role, employeeId, mustChangePassword, mfaEnabled, lastLogin,
createdAt y updatedAt. Fechas ISO y rol con espacios conservan la representación
HTTP anterior. isForcePasswordChange deja de ser público; mustChangePassword
representa el mismo estado y ahora aparece también al crear.

El listado añade metadata de sync y conserva filtros/paginación. Create, update
y ensureEmployeeUser emiten el mismo DTO seguro que devuelven; reuso no emite.
Delete sigue emitiendo solo id e isDeleted. Prisma usa select positivo en estas
consultas/resultados, y el mapper protege incluso si un double lo ignora o añade
columnas futuras. No se modifican hashes/secreto MFA persistidos ni reglas de login.

El módulo users expone solo index.ts. Su aplicación es pura y entra al checker
strict y al guard AST con enumeración no vacía. UserSchema es estricto, incorpora
mfaEnabled y las etiquetas de rol normalizadas. PUT users documenta UpdateUser
de entrada y User de salida, para conservar escritura de contraseña.

## TDD y pruebas

Antes del cambio: seis fallos y un éxito en siete pruebas nuevas
(`/tmp/portal-011-red.log`); el éxito era el tombstone ya seguro. Tras implementar:
40/40 pruebas enfocadas de servicios, flags y límites de módulos
(`/tmp/portal-011-green.log`). El antiguo test que comparaba la contraseña contra
el DTO ahora compara el hash entregado a Prisma, y comprueba que el DTO lo omite.
Los doubles antiguos reciben fechas/MFA para representar el nuevo select completo.

PostgreSQL desechable y HTTP Express real: cuatro casos nuevos de listado normal/
paginado, alta, actualización y ensure creación/reuso. Contraseñas se verifican
con bcrypt contra filas persistidas; el secreto MFA conserva su valor. Los mismos
payloads públicos se comprueban en SocketService.emit. Suite total: 41/41 en siete
archivos, incluidas regresiones auth/feriados y presupuesto entre procesos de spec 010
(`/tmp/portal-011-integration.log`). No se prueba un cliente WebSocket en esta entrega.

OpenAPI, SDK y dos snapshots sincronizados. El generador aplica Prettier al
Swagger y format:check lo incluye, para alinear CI con el hook de commit. Los snapshots cambian por MFA 010 y
por User estricto, mfaEnabled, roles normalizados y requestBody UpdateUser de 011.

## Validación final

| Gate                                | Resultado                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| Backend validate:ci                 | PASS: formato, lint 0/0, tipos globales/strict, SDK, nueve pruebas schemas y build |
| Backend test:coverage               | PASS: 280/280 en 39 archivos; ratchets sin cambios                                 |
| PostgreSQL test:fastify:integration | PASS: 41/41 en siete archivos, BD desechable eliminada al terminar                 |
| Frontend validate:ci:coverage       | PASS: 276/276 en 71 archivos, tipos, lint 0/0, cobertura y build/PWA               |
| docs:check / spec:check             | PASS: 70 Markdown, 19 ADR y once specs                                             |
| secrets:scan / git diff --check     | PASS: cero secretos reales y diff limpio                                           |

Logs locales: `/tmp/portal-011-backend-ci.log`, `/tmp/portal-011-coverage.log`,
`/tmp/portal-011-integration.log` y `/tmp/portal-011-frontend-ci.log`.
Backend CI terminó antes de iniciar frontend, porque check:sdk escribe el SDK.
Cobertura unitaria backend: 24.27% líneas, 30.25% funciones, 18.13% ramas y
23.79% statements. La cobertura PostgreSQL se comprueba por separado.

Reproducir con Node 26: desde backend `npm run validate:ci`,
`npm run test:coverage` y `npm run test:fastify:integration`; luego desde frontend
`npm run validate:ci:coverage`. Desde raíz: `npm run docs:check`,
`npm run spec:check` y `npm run secrets:scan`.

## Alcance

No se migran todavía las rutas users a Fastify. Express sigue siendo principal.
No hay nueva migración PostgreSQL en 011; la migración de spec 010 sigue pendiente
de aplicar en bases existentes antes de ejecutar el backend nuevo. No se hizo
push, CI remota ni deploy. No hay nuevo build Docker ni e2e/staging.

La entrega evita emitir nuevos secretos en estas salidas; no borra copias que
clientes o logs antiguos pudieran conservar. Configuración de difusión y permisos
SocketService, otros DTO como empleados/PIN y payloads de auditoría requieren
sus revisiones propias y no se declaran corregidos aquí. MFA setup sigue entregando
su secreto al usuario autenticado según su contrato de enrolamiento.
