# BDD 025: Preparación del cutover

Spec: [spec.md](spec.md). Tandas 025-A/B1; cutover pendiente.

- Sin token o con token inválido, handshake devuelve Unauthorized, sin detalles
  internos y sin socket conectado ni sala privada.
- Con token propio y query userId de una víctima, la sala es user:ID propio;
  jamás se une a la sala indicada por el cliente.
- Con sesión válida recibe una entrega privada. Tras borrar su sesión, un nuevo
  broadcast no entrega el payload y desconecta al cliente.
- JWT vencido, sesión revocada, usuario eliminado o rol cambiado quedan fuera del
  lote autorizado. Quince sesiones y un duplicado usan dos consultas de lote.
- Un fallo de BD no permite enviar datos: desconecta los clientes afectados.
- Un Origin fuera de allowlist devuelve 403 al handshake Engine.IO, además de CORS.
- Quiosco conserva JWT sin ActiveSession; expiración rechaza entrega igualmente.
- Antes de login no existe conexión frontend. Login conecta; logout cierra.
  Cada handshake obtiene token actual, incluida reconexión tras actualización.

RED inicial: tres pruebas fallaron contra 024 (anónimo aceptado, sala query y
revocación sin comprobar). GREEN y gates se registran en [resultado](result.md).

Pendientes B2–D: secretos/reset,
deudas funcionales, benchmark comparable y cambio de entrypoint con rollback.

## Ejemplos 025-B1

- Admin/Fiscalizador reciben auditLog:created solo con changed:true; Usuario no
  recibe el evento. Seeder failed llega solo a Admin con jobId, sin error.
- Config SMTP modificado: socket entrega changed:true sin key/value/password a
  roles conocidos; la consulta HTTP aplica su autorización existente.
- Usuario vinculado a empleado A recibe marcador de registro A; no recibe
  actualización B ni bulk/deletion sin ownership explícito. Sin vínculo no recibe.
- Usuario solo recibe user_notification con destinatario propio; faltante, vacío
  o destinatario ajeno no entrega. Metadata no sale en el payload.
- Unknown event/role nunca entrega, aunque sea Admin o evento privado.
- Nota creada cambia indicador unread con created:true; no necesita content/id.
  Nota archivada invalida queries mediante quickNote:updated.
- POST SMTP_CONFIG conserva secreto operacional en DB, pero audit CONFIG_SET
  contiene previousValue/newValue REDACTED, tanto Express como Fastify.

RED de política: import del módulo inexistente antes de implementar (sin tests
colectados); no afirmar fallo de una aserción ejecutada. GREEN verifica política,
listener real con tres roles y sesiones persistidas y guard no vacío de productores.
