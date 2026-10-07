# Resultado 025: Fastify principal en desarrollo

Fecha: 2026-10-07. Estado: completada y validada en desarrollo; Fastify principal.

Por instrucción del usuario se cierra la migración para desarrollo. Se había
ampliado el cierre con mejoras de producción que no correspondían al objetivo.
No se añaden specs: deudas B2d2/C pasan a [backlog](backlog.md) posterior.

index.ts carga Fastify por defecto; npm run dev/npm start, root dev y todos los
compose usan HTTP, Socket.IO y jobs integrados. dev:express conserva fixture local
para comparar y revertir. Express y middleware pasan a devDependencies; imagen
final instala solo runtime dependencies en etapa separada. Prisma CLI conserva
engines del builder para migrar sin downloads en boot. Swagger UI tiene assets
directos; multipart usa UploadError neutral conservando 413/400.

Inventario [routes.json](routes.json): 124 rutas reales con método/path y marcas
de autenticación/validación. Runtime aplica guard no vacío/contratos por módulo;
OpenAPI/SDK no cambia. RED: dos tests de cutover fallaron antes de implementar
por entrypoint Express y dependencias runtime. GREEN incluido en coverage.

Backend validate:ci aprobado (formato, lint 0/0, strict, SDK, 9 schema tests, build).
Coverage: 519 pruebas / 65 archivos, ratchets aprobados: líneas 35.69%, funciones
37.97%, ramas 27.94%, statements 35.07%. PostgreSQL aislado final: 515 pruebas /
20 archivos, incluido entrypoint dist/index.js y cierre SIGINT/SIGTERM. Se ajustó
prueba de boot para usar nombre de servidor principal, no mensaje de candidato.
Frontend validate:ci:coverage posterior al SDK: 279 pruebas / 74 archivos, tipos,
formato, lint 0/0, cobertura y build/PWA aprobados.

Imagen final construida y arrancada con migraciones/seed: Fastify 5.12.5 instalado;
express, multer, compression, express-rate-limit y swagger-ui-express ausentes.
CORS/helmet permanecen como dependencias transitivas de Socket.IO/Fastify, sin
arranque Express. Gateway y health/ready comprobados sobre PgBouncer SCRAM.

E2E final: 45 pruebas aprobadas, incluidas accesibilidad, flujos de negocio,
concurrencia, barrido de rutas y dos casos de rendimiento. Se usó workers=1:
primera corrida paralela tuvo 41 aprobadas, una redirección al login en barrido y
tres no ejecutadas, con presión sobre el cupo del admin compartido. No se cambiaron
límites de sesiones, TTL, ratchets ni aserciones para resolver el harness.

[Ciclo de vida](lifecycle.json): purga de sesiones admin, login nuevo y reinicio
real del contenedor con readiness posterior. Rollback local dist/express-main.js:
health, login/logout, Swagger y SIGTERM con exit 0 comprobados contra BD propia.
La primera sonda de reinicio esperaba success en readiness; se corrigió para
status=ready del contrato real y se repitió el ensayo completo con éxito.

[Benchmark](benchmark.json): tres rondas alternadas por framework, 600 requests
por ronda, concurrencia 16 y 100 warmup, cero fallos. GET autenticado/paginado de
feriados con 500 filas, PostgreSQL 18.4 directo; sin PgBouncer. Mediana de las tres
rondas: Express 318 req/s y p95 90.48 ms; Fastify 389 req/s y p95 56.51 ms.
Son señales de una ruta en host compartido, con variación entre rondas y ensayo
lifecycle cercano; no certifican mejora global de app/sockets/jobs. Se conserva
benchmark histórico 008 y no se exige porcentaje de mejora para este cierre.

No quedan tareas de migración pendientes en 025. Backlog posterior no bloquea
el uso de Fastify en desarrollo.

No se tocaron esquema ni versiones instaladas; package-lock reclasifica
dependencias y hace explícitos assets/CLI. BD de ensayos aislada y sin SMTP real. Contenedores/volúmenes propios de staging
y benchmark eliminados; base local preexistente conservada.
Docs/spec/secrets finales aprobados: 142 Markdown, 19 ADR, 25 specs, cero
secretos y 39 fixtures allowlistados.

Rollback local usa dev:express con dependencias dev; para contenedor usar imagen
anterior al cutover/checkout 113c66a. No cambió esquema DB. El resultado certifica
el cambio de servidor en desarrollo, no continuidad de operaciones de producción.

## Arranque local posterior al cierre

Se detuvieron tres instancias de desarrollo anteriores que ocupaban 4000/5173/5174.
El coordinador raíz quedó ejecutándose con Node 26.10.0 y Fastify en este worktree,
con la configuración local ignorada por Git y la BD pweb3_dev existente. Se aplicó
la migración pendiente 20261006211000_auth_mfa_attempts sin borrar datos.
Readiness 4000 y proxy Vite 5173 respondieron 200; Chromium mostró login sin errores
JavaScript. El checkout principal previo no se modifica automáticamente.

## Corrección de CI del PR 14

Verify backend falló en dos expectativas de medidores: la caracterización del
filtro legacy asumía la zona local America/Santiago, mientras el runner usa UTC.
Se trasladó ese caso a pruebas parametrizadas con TZ explícita: UTC incluye la
lectura de mediodía; Santiago la excluye por new Date + setHours heredados.
Cada caso comprueba el offset efectivo, HTTP 200 e IDs exactos y restaura el
entorno al terminar. No se modifica el servicio ni se elimina la deuda funcional.
La suite completa con TZ=UTC pasó 519 pruebas / 20 archivos sobre PostgreSQL
18.4 desechable, incluidos los cuatro casos por zona/adaptador. La BD local y
la app dev no se interrumpieron. El runner eliminó su contenedor propio.

## Historia de las tandas de seguridad

Las secciones siguientes registran límites al momento de cada tanda; sus
referencias a Express principal/bloqueantes no describen el estado final.

Spec: [spec.md](spec.md). BDD: [behavior.md](behavior.md). Plan: [plan.md](plan.md).

## 025-B2d1: reset de contraseña y sesiones

Fecha: 2026-10-07. Estado: implementada y validada localmente; sin commit.
Anterior: 113c66a, protección HTTP y reset transaccional (B2a/b/c).

Reset de contraseña cambia hash/flag y borra sesiones solo del destino en una
withDirectTransaction. Fallo de revocación revierte ambos cambios, sin audit de
éxito. Tras commit se audita cantidad revocada y emite invalidación user:updated;
la política de sockets revalida sesiones y desconecta las revocadas. No se usa
logout global ni se afectan sesiones de otras cuentas.

Auth lleva prueba opaca HMAC id/hash desde validación de contraseña hasta emisión
de sesión, y dentro del challenge MFA firmado. createSession y MFA toman FOR UPDATE
sobre users: contraseña anterior al reset no permite emitir sesión tras commit.
Si la emisión gana el lock, reset borra su sesión; si reset gana, emisión rechaza
snapshot. MFA conserva rol actual y presupuesto persistido. Se elimina el trim
previo de sesión fuera de transacción; el cupo y expulsión por menor actividad
se aplican junto con la inserción, después de comprobar credenciales.

Prueba no aparece en DTO de login normal ni auditoría. El challenge MFA contiene
prueba opaca, nunca hash/contraseña. Challenges anteriores sin prueba se rechazan
y requieren login nuevo. Access tokens de otras cuentas y quiosco no cambian.
Sin Prisma/dependencias/SDK nuevos.

RED real PostgreSQL: 6 fallos de aserciones (tres casos por adaptador) antes de
implementar: sesiones no revocadas, snapshot aceptado y falta de rollback. Luego
se añadió concurrencia de reset/emisión y prueba del puerto privado.
Backend validate:ci aprobado: formato, lint 0/0, strict, SDK, 9 schema tests y build.
Backend coverage final: 517 pruebas / 64 archivos; ratchets aprobados (35.71%
líneas, 37.99% funciones, 27.91% ramas, 35.09% statements). Se ejecutó con
JWT_SECRET de fixture explícito; primer intento sin esa variable falló al importar
cryptoUtils en dos guards, sin relajar el requisito de secreto en producción.
PostgreSQL aislado final: 515 pruebas / 20 archivos, incluidas concurrencia,
rollback, MFA entre procesos y expulsión de sesión menos activa. Runner eliminó
PostgreSQL 18.4 propio; BD local preexistente conservada. Frontend validate:ci:coverage posterior
al SDK aprobado: 279 pruebas / 74 archivos, formato, lint 0/0, tipos, ratchets
y build/PWA. Docs/spec/secrets aprobados: 141 Markdown, 19 ADR,
25 specs, cero secretos y 39 fixtures allowlistados.

B2d2 queda pendiente: barrera de trabajo real HTTP/jobs/scheduler/seed, sin asumir
que cerrar respuesta drena un handler. El inventario y casos de prueba están en
plan.md. Express sigue principal; esta tanda no certifica cutover ni rendimiento.
Rollback futuro de B2d1 restaura sesiones activas después de reset y los challenges
MFA sin versión; no usar como configuración segura.

## 025-B2: Secretos HTTP y reset transaccional

Fecha: 2026-10-07. Estado: commiteada en 113c66a; B2d pendiente en ese cierre.
Anterior: c6caf5c, política de eventos y auditoría protegida (025-B1).

SMTP_CONFIG se enmascara en list/get/set HTTP. Reutilizar ******** exige destino
SMTP idéntico; cambiar host/usuario/puerto/TLS requiere contraseña nueva. EmailService
aplica el mismo vínculo al guardar y verificar, y devuelve fallos genéricos.
El modal explica cómo cambiar destino; almacenamiento operacional no se migra.

AuditService redacta nuevas escrituras y lecturas históricas; JSON/CSV/XML aplican
la misma proyección, CSV/XML por fila conservando cursor/streaming. No se reescriben
históricos en BD. UNHANDLED_ERROR omite mensaje/stack/body/query sensibles. Mapper
HTTP no expone stack ni mensaje interno 5xx incluso en desarrollo. Los handlers
registran código/contexto; no afirmar redacción universal de logs/texto libre.

Reset usa una única withDirectTransaction: conserva ejecutor Admin y admin existente
si tiene ese rol, hash/MFA originales, elimina todas las sesiones y usuarios restantes,
datos operacionales/empleados/jobs/configs salvo db_instance_id. TRUNCATE RESTRICT
explícito evita borrar usuarios por CASCADE. No crea admin ni contraseña fija.
Revocación/reinicio solo tras commit. Rollback inyectado al borrar configs confirma
que los borrados anteriores se revierten y no se solicita reinicio.

Se drena el worker seeding antes de reset y se reabre al terminar; jobs running
impiden reset hasta detenerlos explícitamente. Nuevos jobs runtime no arrancan
en mantenimiento. Drenaje universal de HTTP/tareas nocturnas y watchdog seeder fase 1
siguen pendientes; no se certifica quiescencia global ni cutover. También siguen
pendientes revocación al force-reset-password legacy y scopes/consistencia de C.

RED: import de helper inexistente, sin aserciones colectadas. GREEN: pruebas de
redacción/máscaras, lectura/exportación histórica y reset/rollback con BD real en
Express/Fastify. Ajustes de fixtures sustituyen mensajes SMTP internos por contrato
genérico y usan AuthError tipado en piloto de paridad.

Backend validate:ci aprobado: formato, lint 0/0, strict, SDK, 9 pruebas schema y build.
Backend coverage: 516 pruebas / 64 archivos; ratchets aprobados (35.76% líneas,
37.98% funciones, 27.95% ramas, 35.13% statements). Frontend validate:ci:coverage
aprobado después del SDK: 279 pruebas / 74 archivos, formato, lint 0/0, tipos,
ratchets y build/PWA (19.5% líneas, 15.71% funciones, 15.33% ramas).
PostgreSQL aislado: 509 pruebas / 20 archivos aprobados en ambos adaptadores,
incluidas redacción histórica y rollback real del reset. Runner eliminó PostgreSQL
18.4 desechable; BD local preexistente conservada. Docs/spec/secrets aprobados:
141 Markdown, 19 ADR, 25 specs, cero secretos y 37 fixtures allowlistados.
Sin cambios Prisma,
dependencias, Swagger/SDK. BD usada solo desechable, sin operaciones externas.

Rollback de esta tanda: revertir 113c66a restaura exposición HTTP y reset
legacy; no constituye una configuración segura. Express sigue principal. C/D
conservan deudas funcionales, gateway/e2e, benchmark equivalente y rollback del servidor.

## 025-B1: Eventos autorizados y auditoría de configuración

Fecha: 2026-10-07. Estado: commiteada en c6caf5c.
Anterior: c8767d3, autenticación de sockets y sesiones (025-A).

La política pura modules/realtime usa API pública y strict. Eventos desconocidos
se deniegan; negocio entrega changed:true y no filas, credenciales ni contenido
privado. Audit se limita a Admin/elevado/Fiscalizador, users a Admin y seeder a
Admin con jobId/contadores explícitos, sin errores. Usuario/quiosco solo recibe
records/assignments/corrections/employee propios con ownership explícito.
Notificaciones personales requieren destinatario validado y omiten metadata.
Lifecycle global proyecta solo estado, operación enum y motivo permitido/generic.

Frontend usa created:true para indicador de notas y escucha updated al archivar.
ConfigService redacta SMTP_CONFIG/EMAIL_NOTIFICATION_RULES completos en nuevas
auditorías; conserva secretos operacionales en storage. No modifica reads HTTP
ni limpia audit histórico. Reset/credenciales fijas y fallos HTTP siguen pendientes.

RED de módulo no existente falló durante import, antes de implementar; no fueron
aserciones colectadas. GREEN de política, listener con tres roles y guard no vacío
de productores aprobados. Guard exige contrato para eventos literales existentes.
Boundary guard y check:modules cubren aplicación pura y consumidores públicos.

| Gate                          | Resultado                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Backend validate:ci           | Formato, lint 0/0, strict, SDK, 9 schema tests y build aprobados                                                |
| Backend coverage              | 511 pruebas / 62 archivos; ratchets aprobados: líneas 35.41%, funciones 37.54%, ramas 26.88%, statements 34.76% |
| Seguridad focalizada          | 14 pruebas / 4 archivos: proyecciones, roles/ownership, listener real, contratos y audit redactado              |
| PostgreSQL aislado            | 503 pruebas / 20 archivos; sesiones reales y POST SMTP en Express/Fastify                                       |
| Frontend validate:ci:coverage | 279 pruebas / 74 archivos; formato, lint 0/0, tipos, cobertura y build/PWA                                      |

Backend CI precedió frontend CI, sin reescritura SDK durante sus gates.
Docs/spec/secrets aprobados: 141 Markdown, 19 ADR, 25 specs, cero secretos
(35 coincidencias de fixtures allowlistadas). PostgreSQL desechable eliminado;
BD local preexistente conservada.
Sin cambios de Prisma/dependencias/SDK. No correos, backup/restore/reset reales ni
despliegue. La validación completa de gateway/carga se repetirá tras completar la
política HTTP y las deudas previas antes del cutover; no reutilizar métricas de 024
como certificación del runtime nuevo.

Bulk/deletion sin employeeId no emite hacia Usuario/quiosco: HTTP conserva
refetch/polling. No se inventa ownership desde id del registro. Dos consultas por
lote/evento conservan costo pendiente de medir/agrupación de ráfagas.
Revertir B1 recupera política A con su exposición entre roles; Express sigue
principal. Siguiente B2: secretos HTTP/históricos, errores y reset/credenciales.

# Histórico 025-A: Sesiones y salas de Socket.IO

Spec: [spec.md](spec.md). BDD: [behavior.md](behavior.md). Plan: [plan.md](plan.md).

Fecha: 2026-10-07. Estado: commiteada en c8767d3.
Commit anterior: c2a31d2, runtime integrado (024). La 025 completa sigue pendiente.

## Cambio

Handshake exige token, autenticación compartida y sala derivada de identidad del
servidor. CORS y allowRequest aplican allowlist HTTP; no cookies. Cada entrega
revalida JWT/sesión/usuario/rol por lote; fallo de BD desconecta sin datos ni
credenciales en logs. Barrido de 30 segundos controla clientes ociosos.
Frontend conecta tras login, lee token actual al reconectar y cierra al salir.

No se promueve Fastify. En el cierre de 025-A, broadcasts entre roles autenticados conservaban
payloads legacy. La 025-B1 posterior aplica proyecciones/autorización.
No se afirma mejora de rendimiento; dos queries por evento/lote requieren medir
costo bajo ráfagas. auth:force_logout omite revalidación para avisar a clientes
previamente autenticados tras borrar sesiones; no es una entrada del cliente.
Quiosco conserva semántica de JWT sin ActiveSession y validación de expiración.

## Evidencia

RED previo a cambios: tres pruebas fallan por conexión anónima, sala query y
revocación no comprobada. GREEN incluye listener real y batch de 15 identidades
más duplicado, expiración, revocación, usuario eliminado/cambio de rol y fallo DB.
Backend validate:ci final aprobado tras ajustes de lifecycle y rechazo de
destinatario vacío. Cobertura: 497 pruebas / 59 archivos, ratchets
aprobados (35.06% líneas, 37.39% funciones, 26.11% ramas, 34.38% statements).
Seguridad final focalizada: 10 pruebas / 2 archivos; incluye Origin rechazado,
barrido periódico y destinatario vacío/ajeno sin entrega.
Frontend validate:ci:coverage aprobado: 278 pruebas / 73 archivos, formato,
lint 0/0, tipos, cobertura y build/PWA. Backend CI precedió frontend sin solapamiento
SDK; rerun backend posterior. Integración final: 500 pruebas / 20 archivos,
con listener real y sesión persistida borrada antes de emitir. El runner creó y
eliminó PostgreSQL 18.4 propio; se conservó la BD local preexistente.
Docs/spec/secrets aprobados (141 Markdown, 19 ADR; 25 specs; cero secretos).
No hubo cambios Prisma/dependencias/SDK ni operaciones externas.

## Rollback y trabajo restante

Revertir esta tanda recupera el contrato de sockets de 024, incluyendo sus deudas;
no usar como configuración segura de producción. Servidor principal sigue Express.
Antes de cutover completar 025-B/C/D descritas en plan y tareas: autorización de
payloads, secretos/reset, deudas funcionales y benchmark/rollback de entrypoint.
La prueba de gateway y rollback de 024 no certifica estos nuevos sockets; se
repetirá el ensayo completo con política de eventos final antes del cutover.
