# BDD 025: Preparación del cutover

Spec: [spec.md](spec.md). Primera tanda 025-A; cutover pendiente.

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

Pendientes B–D: autorización de payloads por rol/empleado, secretos/reset,
deudas funcionales, benchmark comparable y cambio de entrypoint con rollback.
