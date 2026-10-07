# Resultado 025: Preparación del cutover

Spec: [spec.md](spec.md). BDD: [behavior.md](behavior.md). Plan: [plan.md](plan.md).

## 025-B2: Secretos HTTP y reset transaccional

Fecha: 2026-10-07. Estado: tanda implementada y validada localmente, sin commit; B2d pendiente.
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

Rollback de esta tanda: revertir su commit futuro restaura exposición HTTP y reset
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
