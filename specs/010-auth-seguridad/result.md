# Resultado — Spec 010

Estado: Implementado — validado localmente, sin deploy.

## Cambios

- AuthService valida JWT pendiente estricto antes de acceder al estado MFA.
- Elegibilidad, TOTP y contadores se serializan con FOR UPDATE y transacción directa.
- MFA deshabilitado/sin secreto devuelve 401; archivado entre factores, 403.
- Cinco fallos en cinco minutos persisten contador y bloqueo por cinco minutos. El quinto responde 401, los siguientes 429 con Retry-After.
- Cambiar IP, desafío o proceso no reinicia el límite. Éxito limpia estado y usa rol actual.
- PIN conserva contrato y bloqueo permanente al quinto fallo; las solicitudes concurrentes producen intentos 1–5.
- Migración aditiva y restricción de rango; Prisma regenerado; estado nuevo omitido de DTO de usuarios y sockets.
- OpenAPI/SDK y ambos snapshots añaden solo las tres respuestas de error MFA y Retry-After.

## TDD y BDD

Siete pruebas nuevas fallaron contra la implementación anterior: 7 fallos y
27 regresiones aprobadas. Evidencia local `/tmp/portal-010-red.log`. Después de
implementar, 34/34 aprobaron (`/tmp/portal-010-green.log`). Se añadieron dos
pruebas para procesos independientes y DTO: 36/36 aprobadas contra PostgreSQL
18.4 desechable (`/tmp/portal-010-integration.log`). B1–B7 corresponden a
`Spec 010 MFA and PIN security` en auth.test.ts; B8 mantiene el caso de PIN
válido con contador previo de la suite 009. La prueba de dos procesos usa
mfa-worker.cjs, cada uno con pools propios y cuatro intentos.

La comprobación final amplía archivo a MFA habilitado y deshabilitado y verifica
que un desafío firmado diferente no evade el bloqueo, no vuelve a verificar TOTP
ni prolonga el TTL. Total final: **37/37** en seis archivos, incluidos los cinco
casos Express heredados; `/tmp/portal-010-integration-final.log`.

## Validación

| Gate                                     | Resultado                                                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| Backend validate:ci                      | PASS: formato, lint 0/0, strict/global tsc, SDK, nueve pruebas de schemas y build |
| Backend test:coverage                    | PASS: 268/268 en 38 archivos; ratchets sin cambios                                |
| PostgreSQL 18.4 test:fastify:integration | PASS: 37/37 en seis archivos, migración real y dos procesos independientes        |
| Frontend validate:ci:coverage            | PASS: 276/276 en 71 archivos; formato, lint 0/0, tipos, cobertura y build/PWA     |
| docs:check                               | PASS: 65 Markdown y 19 ADR indexados                                              |
| spec:check                               | PASS: diez specs                                                                  |
| secrets:scan                             | PASS: cero secretos reales                                                        |
| git diff --check                         | PASS                                                                              |

Backend: `/tmp/portal-010-backend-ci-final.log` y
`/tmp/portal-010-coverage-final.log`. Frontend:
`/tmp/portal-010-frontend-ci.log`. Las validaciones CI de paquetes se ejecutaron
en serie para evitar escrituras simultáneas del SDK. El último backend CI vuelve
a confirmar sincronización después de terminar frontend, sin modificar su SDK.
La cobertura unitaria global es 23.94% líneas, 29.81% funciones, 17.76% ramas y
23.46% statements; la suite PostgreSQL verifica los nuevos caminos de seguridad
por separado y no se contabiliza en esos porcentajes.

No se ejecutó CI remota, e2e ni nuevo build Docker. No cambiaron dependencias,
Dockerfiles ni arranque. El build TypeScript y el runtime conectado a PostgreSQL
sí se verificaron en Node 26. Los contenedores desechables se eliminaron al terminar.

## Reproducir

Desde backend con Node 26: `npm run validate:ci`, `npm run test:coverage` y
`npm run test:fastify:integration`. Después, desde frontend:
`npm run validate:ci:coverage`. Desde raíz: `npm run docs:check`,
`npm run spec:check` y `npm run secrets:scan`.

## Límites y siguiente entrega

No se cambia el servidor principal, no se aplican migraciones a BD del usuario
ni se hace deploy. PgBouncer/gateway/staging siguen sin validación por ausencia
de `.env.staging`. El runner crea y elimina su propio PostgreSQL.

No se añade uso único de desafío/TOTP ni transacción conjunta MFA+creación de
sesión. El throttle de login continúa en memoria por proceso. MFA sí comparte
el presupuesto persistido entre procesos. No se cambia duración de JWT ni PIN
predeterminado ni se declara mejora de rendimiento.

Hallazgo para la entrega de usuarios: UserService conserva proyecciones heredadas
con spreads de filas Prisma que incluyen passwordHash y mfaSecret en respuestas
y eventos. Esta entrega omite sus tres columnas nuevas; conforme a AGENTS.md se
señala el comportamiento heredado sin alterar silenciosamente otros contratos.
La entrega posterior [spec 011](../011-usuarios-dto-publico/result.md) corrige
este hallazgo con DTO públicos explícitos que excluyen secretos.

## Operación

Aplicar `npm run db:migrate:deploy` con DIRECT_URL y regenerar cliente Prisma
antes de ejecutar el backend nuevo. La migración SQL añade columnas con default
seguro y nullable, sin eliminar datos. No fue aplicada a bases existentes.
