# Resultado 025-A: Sesiones y salas de Socket.IO

Spec: [spec.md](spec.md). BDD: [behavior.md](behavior.md). Plan: [plan.md](plan.md).

Fecha: 2026-10-07. Estado: primera tanda implementada y validada localmente; sin commit.
Commit anterior: c2a31d2, runtime integrado (024). La 025 completa sigue pendiente.

## Cambio

Handshake exige token, autenticación compartida y sala derivada de identidad del
servidor. CORS y allowRequest aplican allowlist HTTP; no cookies. Cada entrega
revalida JWT/sesión/usuario/rol por lote; fallo de BD desconecta sin datos ni
credenciales en logs. Barrido de 30 segundos controla clientes ociosos.
Frontend conecta tras login, lee token actual al reconectar y cierra al salir.

No se promueve Fastify. Broadcasts entre roles autenticados todavía conservan
payloads legacy: autorización por rol/empleado y deudas de specs previas pendientes.
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
