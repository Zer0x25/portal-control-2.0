# Admisión y drenaje de flujos administrativos

El registro `operationRuntime` conserva las promesas reales de los flujos asíncronos
admin y maintenance: diagnósticos, cierres, contraseña, sesiones, backup, restore,
restart, reset, seed y gestión/consulta de jobs. Una respuesta enviada, un stream
cerrado o una desconexión no retiran el trabajo del registro.

Fastify cierra esta admisión y espera el registro en `preClose`, antes del cierre
de jobs y sockets del runtime integrado. También espera el registro antes de pools
en `onClose`. Express aplica el mismo orden antes de detener jobs y cerrar pools.
Las nuevas invocaciones reciben 409 durante apagado. Las promesas ya admitidas
finalizan normalmente; los errores se conservan para su consumidor y el drenaje
espera también las operaciones fallidas. No hay timeout que libere propiedad.

El drenaje previo a jobs evita que un reset admitido reabra fase 2 después de que
el apagado haya cerrado sus workers. Los snapshots administrativos síncronos
conservan su contrato y no participan en el registro. El registro no impone
exclusión entre flujos: la reserva de mantenimiento conserva esa responsabilidad.

La prueba de runtime integrado inicia una operación retenida, cierra Fastify,
comprueba que rechaza admisión y no ha detenido jobs, y realiza una escritura real
antes de liberar el cierre. Tres pruebas unitarias cubren múltiples operaciones,
respuesta previa al motor, fallos síncronos/asíncronos y reapertura tras drenaje.

## Alcance pendiente

Este bloque es local y cubre las fachadas administrativas; no constituye la
barrera universal de todos los handlers HTTP ni coordina procesos distintos.
Los workers fase 2 y reportes conservan sus registros propios. Reset/restore
requieren todavía coordinación distribuida con el resto de productores.
Restore elimina `public`, incluidos los locks existentes: una reserva almacenada
solo allí no puede garantizar exclusión durante toda la restauración. No se
modifica ni se ejecuta restore sobre una base del usuario en esta tanda.
