# Spec 025: Cambio de servidor principal

- Estado: En ejecución; 025-A commiteada, política de eventos 025-B1 validada localmente
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

La 025-A no resolvía autorización de payloads entre roles autenticados. La 025-B1
añade los contratos de eventos y scopes detallados abajo;
no autoriza promover Fastify ni retirar Express mientras queden bloqueantes.
La revalidación consulta BD por evento; medir su costo y agrupar ráfagas antes de
certificar rendimiento del runtime completo.

## Inventario de seguridad previo al cutover

| Superficie                             | Contrato actual tras 025-A                                                | Pendiente para cutover                                       |
| -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Engine.IO polling/websocket /socket.io | allowRequest rechaza Origin no permitido; handshake exige token           | ensayo final por gateway con contratos de eventos completos  |
| Sala user:ID                           | ID derivado del servidor, query ignorada; destinatario vacío no emite     | scopes de notificaciones por empleado/rol                    |
| Eventos generales de negocio           | invalidaciones sin filas ni datos privados                                | medir costo de entrega y completar contratos HTTP pendientes |
| auditLog:created                       | invalidación solo Admin, Supervisor_Elevado y Fiscalizador                | ensayo final de gateway                                      |
| config:updated                         | invalidación sin key/value                                                | lecturas HTTP/históricos protegidos pendientes               |
| seeder:phase2_*                        | solo Admin; jobId y contadores explícitos, sin error                      | redacción de logs/errores HTTP pendiente                     |
| auth:force_logout                      | servidor avisa tras invalidación; sin revalidación que impediría el aviso | conservar control exclusivamente del servidor                |
| Clientes sin tráfico                   | barrido 30 s; expiry/revocación desconecta                                | medir ráfagas y escalabilidad del chequeo                    |
| 123 rutas HTTP                         | contratos previos en specs 013–023                                        | cerrar deudas funcionales/seguridad listadas en roadmap      |

Esta tabla no marca AC1 completo: los contratos nuevos de eventos/scopes y la
retirada de Express requieren inventario definitivo en las siguientes tandas.

## 025-B1: contrato de eventos

Aplicación pura modules/realtime con API pública index.ts, strict y guard de
consumidores/infraestructura. Unknown event/role se deniega. Contratos:

| Familia                              | Receptores                                                                                                           | Payload                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| records, assignments, corrections    | Admin, Supervisor_Elevado, Supervisor, Reloj_Control, Fiscalizador; Usuario/quiosco solo employeeId propio explícito | changed:true                                                      |
| employee:updated                     | mismos roles staff; Usuario/quiosco solo id propio explícito                                                         | changed:true                                                      |
| notes, shift reports, leaves, meters | authorizeSupervisor: Admin, Supervisor_Elevado, Supervisor, Reloj_Control                                            | changed:true; notas creadas añaden created:true                   |
| auditLog:created                     | Admin, Supervisor_Elevado, Fiscalizador                                                                              | changed:true                                                      |
| user:updated                         | Admin                                                                                                                | changed:true                                                      |
| holidays, patterns, configs          | roles conocidos autenticados                                                                                         | changed:true, sin key/value/config/secretos                       |
| seeder:phase2_*                      | Admin                                                                                                                | jobId; progress añade dayCompleted/totalDays enteros no negativos |
| user_notification                    | destinatario validado explícito, sin broadcast                                                                       | title/message/type; sin metadata                                  |
| system_notification                  | Admin                                                                                                                | aviso genérico sin contenido/metadata de origen                   |
| system:maintenance                   | roles conocidos autenticados                                                                                         | active, operation enum backup/restore/reset                       |
| auth:force_logout                    | clientes previamente autenticados, incluso tras borrar sesiones                                                      | reason permitido/generic, restartRecommended boolean              |

Si evento de registros/bulk/eliminación no contiene employeeId, no se inventa
scope para Usuario/quiosco: no recibe invalidación. Sus queries HTTP conservan
refetch/polling; notificar a todos los empleados sin ownership sería una filtración.
Frontend conserva indicador de notas mediante created:true y escucha updated para
invalidar al archivar. No requiere contenido/id del registro en el socket.
ConfigService audita SMTP_CONFIG/EMAIL_NOTIFICATION_RULES con valores completos
redactados antes de persistir; almacenamiento operacional de credenciales no cambia.
No limpia históricos ni cambia contrato de lectura HTTP de configuración elevada.
Reset/credenciales fijas, redacción de fallos HTTP/históricos y deudas funcionales
siguen bloqueando cutover (025-B2/C/D).
