# Invalidación automática de caché KPI

Contrato correctivo posterior a [025](spec.md), para la deuda de 018.

Una revisión global persistida cambia en la misma transacción que las fuentes:
empleados, marcajes, asignaciones, patrones, permisos y feriados. Triggers por
statement cubren INSERT/UPDATE/DELETE/TRUNCATE, SQL directo, lotes y soft deletes.
Un rollback revierte también la revisión. Los cambios sin filas afectadas pueden
invalidar conservadoramente. Auditorías, usuarios y escrituras de caché no avanzan
la revisión. La migración crea el singleton; debe conservarse en reset de datos.

Summary y detailed leen la revisión antes de empleados y contexto batch. El
envelope interno pasa a `{ version: 2, sourceRevision: "…", days: [...] }`.
Solo se reutiliza caché de esa revisión, con el contrato de mes completo previo.
Caché legacy o de otra revisión se reconstruye al leerla; no se borra masivamente
ni se recalcula desde la transacción que modifica las fuentes. El contexto de scheduling y la lectura diaria sin contexto excluyen permisos y
asignaciones archivados (`isDeleted`); invalidarlos ahora refleja su retiro.
DTO y cierre contable mantienen sus contratos. Los meses cerrados reflejan cambios confirmados
en las fuentes al consultarlos; la caché no es un libro contable inmutable.

Un cálculo conserva la revisión inicial al persistir, aunque haya escrituras
concurrentes. Una consulta que comienza tras ese commit exige la nueva revisión,
por lo que no reutiliza un cálculo antiguo guardado tardíamente. Una respuesta en
curso puede reflejar inputs anteriores o intercalados: no se promete un snapshot
transaccional del reporte. Un cálculo antiguo puede reemplazar físicamente otro
nuevo, pero queda invalidado por su revisión y la siguiente lectura lo repara.

La revisión es global: cambios de otro empleado o período invalidan también los
meses consultados después. La actualización del singleton serializa brevemente
las transacciones de escritura de estas fuentes y puede tener contención. No se
ha medido carga de producción; revisiones por empleado/período y persistencia
condicional son optimizaciones posteriores, sin cambiar el criterio de vigencia.
No truncar/reiniciar la revisión separadamente de las cachés en restauraciones.

Integración Express/Fastify cubre reutilización sin cambios, actualización de
marcajes, patrones/asignaciones, permisos, feriados y tipo de jornada; rollback
transaccional y un interleaving determinista entre cálculo, cambio confirmado y
persistencia tardía. Pruebas unitarias rechazan versiones/revisiones obsoletas y
mantienen la validación estructural del mes.
