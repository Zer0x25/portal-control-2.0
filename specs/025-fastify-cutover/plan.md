# Plan 025: Cambio de servidor principal

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Estrategia

1. Inspeccionar Gateway, staging y retirada de Express y sus servicios; completar contratos y riesgos.
2. Escribir behavior.md con ejemplos y pruebas que fallen primero.
3. Extraer puertos y casos de uso, implementar adaptador y guard no vacío.
4. Verificar permisos, fallos, persistencia y efectos; registrar result.md.

## Archivos a tocar

Inventario pendiente: identificar routers, servicios y tests de la superficie
indicada antes de modificar código. No reutilizar controllers Express como
handlers Fastify. En 024/025 agregar entrypoint, sockets/jobs, compose, gateway
y contrato OpenAPI al inventario.

## Verificación y rollback

Backend: validate:ci, test:coverage, test:fastify:integration. Después del SDK,
frontend: validate:ci:coverage. Raíz: docs:check, spec:check, secrets:scan.
024/025 requieren además staging, e2e, carga y ciclo de vida del servidor.
Mientras Express siga principal, revertir el registro del módulo candidato;
025 debe documentar y ensayar rollback antes de cambiar el servidor.

## Tandas concretas

1. 025-A: autenticación socket, salas derivadas del servidor, revalidación por lote
   antes de entregar, expiración/revocación y lifecycle frontend. RED/GREEN con
   listener real y sesiones persistidas. No cambiar servidor principal.
2. 025-B1: contrato de eventos por rol/empleado; evitar payloads globales sensibles,
   seeder solo Admin, notificaciones personales y redacción de nuevas auditorías.
   025-B2: resolver secretos HTTP/históricos de configs,
   auditorías de errores y credenciales/reset destructivo documentados en 020/023.
3. 025-C: resolver deudas funcionales previas mediante contratos explícitos
   (fechas Chile, ownership, extensión de leaves, reportes y consistencia).
4. 025-D: benchmark equivalente, e2e/gateway, rollback y cambio de entrypoint;
   retirar Express y adaptar guards/test helpers solo tras completar bloqueantes.

Archivos 025-A: services/socketService.ts y socketAuthentication.ts;
frontend services/socketService.ts y hooks/useSocketEvents.ts;
unit/socketSecurity.test.ts, socketAuthentication.test.ts y runtime.test.ts
con listener/BD reales; pruebas frontend de handshake y login/logout.
No reutilizar middleware Express para autenticar Socket.IO.

Archivos B1: modules/realtime/application/eventPolicy.ts/index.ts, SocketService,
configs/application/auditValue.ts y fachada ConfigService; guard de strict/módulos
y productores con inventario no vacío; hook/socket badge frontend; tests policy,
listener websocket real, runtime con sesiones persistidas y POST configs en ambos
servidores. No introducir dependencia Express en aplicación ni cambiar schemas/SDK.
