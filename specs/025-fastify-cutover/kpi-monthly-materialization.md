# Materialización mensual KPI

Contrato correctivo posterior a [025](spec.md), para la deuda de 018.

La preparación batch carga contexto de scheduling desde el primer día del mes
inicial hasta el último del mes final. Así una consulta parcial puede materializar
meses completos con turnos, permisos y feriados fuera del rango solicitado. Los
marcajes de la respuesta en tiempo real mantienen el rango solicitado; el cache
miss conserva su lectura mensual completa. No hay consultas de contexto por día.

`dailyBreakdown` pasa a un envelope interno `{ version: 1, days: [...] }`.
La versión certifica el nuevo contrato de contexto; no es una revisión de fuentes.
Se exige un día por fecha del mes, en orden, con campos tipados y números finitos.
Arrays legacy, JSON inválido, meses incompletos o datos malformados se reconstruyen
al leerlos y se reemplazan por upsert. No hay migración masiva ni cambios en DTO HTTP.
Una caché nueva válida continúa reutilizándose bajo la política de cierre actual.
Fallar al persistir la reconstrucción devuelve error; no se entrega caché corrupta.

Pruebas unitarias cubren años bisiestos, meses de 28/29/30/31 días, versiones,
duplicados, mes incorrecto y tipos inválidos. Integración Express/Fastify consulta
un solo día, verifica el mes materializado con turno/permiso/feriado posteriores,
reutiliza ese resultado y reconstruye caché legacy/corrupta.

Invalidación por cambios en fuentes y envelope con revisión se completan en
[kpi-cache-invalidation](kpi-cache-invalidation.md). Este cambio no altera cierre
contable ni formatos horarios del host.
