# Contexto diario KPI en Chile

Contrato correctivo posterior a [025](spec.md), para la deuda de 018.

Overview consulta marcajes entre ayer y hoy de Chile, inclusive. La planificación
consulta el contexto del día de Chile, incluso cuando UTC ya está en el siguiente
día. Ambos usan el contexto batch compartido de scheduling para los empleados
activos, sin búsquedas individuales de dependencias.

El contexto de overview abarca ayer y hoy: incluye asignaciones que terminaron
ayer, permisos y feriados de ambos días. La detección de falta de marcaje de ayer
consulta la presencia de un registro de ayer independientemente del último
registro: un marcaje de hoy no oculta esa falta. Se conservan prioridades y reglas
existentes de anomalías físicas y jornadas abiertas de más de 14 horas.

Pruebas compartidas Express/Fastify fijan el reloj a un instante donde Chile y UTC
están en fechas distintas. Comprueban turno terminado ayer, exclusión de registros
futuros, permiso/feriado de ayer, marcaje de ayer y vacaciones solo hoy.

Invalidación de caché mensual, contexto completo al materializar meses, JSON de
caché corrupto y formatos horarios del host siguen pendientes. No se cambia la
política de cierre contable ni la reutilización de caché en este arreglo.
