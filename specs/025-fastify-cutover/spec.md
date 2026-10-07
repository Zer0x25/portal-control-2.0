# Spec 025: Cambio de servidor principal

- Estado: En ejecución; primera tanda de seguridad de sockets
- Fecha: 2026-10-07
- Ruta: [roadmap](../roadmap-fastify.md)

## Problema

La superficie Gateway, staging y retirada de Express debe integrarse al candidato Fastify para completar
la migración modular y disponer de contratos y pruebas mantenibles.

## Alcance

Paridad completa, e2e, carga comparable, rollback y eliminación de dependencias Express. Inventariar cada ruta real antes de implementar, incluidas las
anidadas. Compartir casos de uso entre los adaptadores cuando corresponda.

Fuera: módulos de otras specs y cambios de producto no declarados. Esta spec
es una previsión; no autoriza despliegues ni operaciones externas.

## Criterios de aceptación

- [ ] AC1: Inventario no vacío con método, path, permisos, validación, respuestas y efectos de cada ruta/flujo.
- [ ] AC2: BDD concreto y pruebas RED antes de implementar; comportamiento vigente y errores caracterizados.
- [ ] AC3: Implementación con puertos tipados, límites públicos y sin dependencias de infraestructura en aplicación.
- [ ] AC4: Paridad verificada con BD aislada donde aplique; contratos de seguridad y fallos comprobados.
- [ ] AC5: Gates backend/frontend secuenciales, docs/SDK y ratchets aprobados; resultado con límites y rollback.

## Restricciones

Constitución I–V, Node 26, React/Vite y PostgreSQL se conservan. Usar
withDirectTransaction para transacciones interactivas. No reducir ratchets.
El cambio de servidor principal se reserva a 025. Para 025, AC3 exige además
retirar dependencias Express una vez demostrado el rollback.

## Trazabilidad

Dependencia prevista: 024; revisar dependencias reales al iniciar.
Tests y archivos concretos se detallarán tras el inventario de AC1.

## Primera tanda: sesiones y salas (025-A)

Dependencia confirmada: 024, commit c2a31d2. Antes del cutover se elimina acceso
anónimo a Socket.IO y selección de identidad por query. El cliente envía token
vigente mediante auth del handshake; backend valida JWT/sesión con autenticación
compartida y deriva sala user:ID de la identidad validada. CORS/allowRequest usan
la allowlist HTTP, sin credenciales cookie.

Antes de cada entrega se verifican JWT, sesiones vigentes y existencia/rol del
usuario con dos consultas por lote completo, sin búsquedas por socket. Cambio de
rol exige nueva sesión/token; falta de BD desconecta y no entrega datos. Barrido
cada 30 s desconecta sesiones inválidas aunque no existan eventos. Kiosk conserva
semántica JWT sin ActiveSession. auth:force_logout llega a clientes previamente
autenticados después de borrar sesiones, para completar la revocación global.
No se registran tokens ni detalles del fallo de autenticación.

Frontend conecta después del login, toma token actual en cada handshake y cierra
al salir/cambiar de usuario. No cambia duración de sesiones ni política HTTP.

Esto no resuelve autorización de payloads entre roles autenticados. Broadcasts
actuales siguen sujetos a una siguiente tanda con contratos de eventos y scopes;
no autoriza promover Fastify ni retirar Express mientras queden bloqueantes.
La revalidación consulta BD por evento; medir su costo y agrupar ráfagas antes de
certificar rendimiento del runtime completo.

## Inventario de seguridad previo al cutover

| Superficie                             | Contrato actual tras 025-A                                                | Pendiente para cutover                                      |
| -------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Engine.IO polling/websocket /socket.io | allowRequest rechaza Origin no permitido; handshake exige token           | ensayo final por gateway con contratos de eventos completos |
| Sala user:ID                           | ID derivado del servidor, query ignorada; destinatario vacío no emite     | scopes de notificaciones por empleado/rol                   |
| Eventos generales de negocio           | solo sesiones vigentes; payloads legacy globales                          | autorizar o reemplazar por invalidación sin datos sensibles |
| auditLog:created                       | sesiones vigentes de todos los roles                                      | limitar a roles de auditoría                                |
| config:updated                         | conserva key/value global                                                 | excluir secretos y limitar payload/roles                    |
| seeder:phase2_*                        | payload global autenticado                                                | limitar a Admin y redactar fallos                           |
| auth:force_logout                      | servidor avisa tras invalidación; sin revalidación que impediría el aviso | conservar control exclusivamente del servidor               |
| Clientes sin tráfico                   | barrido 30 s; expiry/revocación desconecta                                | medir ráfagas y escalabilidad del chequeo                   |
| 123 rutas HTTP                         | contratos previos en specs 013–023                                        | cerrar deudas funcionales/seguridad listadas en roadmap     |

Esta tabla no marca AC1 completo: los contratos nuevos de eventos/scopes y la
retirada de Express requieren inventario definitivo en las siguientes tandas.
