# Auditoría semántica de los paneles

Inspección autenticada en escritorio el 2026-11-21, con datos y rol de administrador presentes en esa sesión. El shell expone un `main`, navegación principal y enlace para saltar al contenido. No se inspeccionaron todos los roles, estados de datos o tamaños de pantalla.

## Correcciones aplicadas

- Dashboard: widgets como lista nombrada, carga anunciada como estado, títulos de widget `h2` y valores de métricas sin semántica de encabezado.
- Supervisión: navegación identificada, botones con estado seleccionado y títulos principales del resumen `h2`. Las filas de personas son botones nativos y las métricas seleccionables comunican su estado.
- Filas interactivas de dashboard y métricas seleccionables permiten activación por teclado. En navegador se abrió el detalle de turno con Enter y el expediente de una persona con Enter.
- El ADR enlazado en la spec establece un criterio transversal; no cambia automáticamente las demás vistas.

- Los diálogos `CinematicModal` y de expediente comparten aislamiento del fondo, gestión del foco y Escape; ambos se verificaron en navegador con restauración del foco.

## Hallazgos pendientes

- El expediente de empleado ahora se anuncia como diálogo nombrado; en navegador se verificaron foco inicial, ciclo de Tab, Escape y retorno a la fila de origen.
- No se ejecutó una auditoría completa de lector de pantalla, responsive, todos los roles ni todas las pestañas y estados de las páginas.
