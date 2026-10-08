# Propiedad y drenaje del seed de fase 1

Contrato correctivo posterior al cutover, parte de la
[tanda 5](tandas.md) y del [backlog](backlog.md).

La fase 1 reserva la operación local antes de abrir el stream. Mientras el motor
trabaja, reset, backup, restore y otra fase 1 reciben conflicto; iniciar o
reanudar fase 2 también rechaza una operación de sistema activa. El mantenimiento
HTTP y los jobs recurrentes consultan la misma reserva local.

El watchdog cierra la respuesta una sola vez y describe inactividad, sin afirmar
que canceló el motor. No se escriben progreso, errores ni éxito sobre ese stream
cerrado. La reserva se libera únicamente al finalizar el motor y la creación del
job detenido. Los errores del motor devuelven texto neutral.

Un propietario de fase 1 conserva la promesa real, rechaza solapamiento y cierra
admisión al drenar. Runtime integrado (Express y Fastify) y cierre de la fábrica
Fastify esperan esa promesa antes de cerrar los pools. El cierre de HTTP por
inactividad no equivale a cancelación ni garantiza rollback de datos ya escritos.

Configuraciones iniciales se leen en una consulta por lote y se crean con
skipDuplicates; nunca se sobrescriben valores existentes. Las asignaciones se
agrupan en una pasada en lugar de filtrar la colección por cada empleado.

## Límites pendientes

La reserva continúa siendo local. Fase 2 ya iniciada y otras operaciones HTTP
admitidas previamente requieren el drenaje universal pendiente. Reset/restore y
scheduler necesitan coordinación entre procesos; el watchdog no ofrece
cancelación cooperativa del motor. La contención del contador KPI requiere una
medición aislada antes de cambiar su estrategia. No se declara cerrada la tanda 5.
