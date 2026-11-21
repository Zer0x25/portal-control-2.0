# Auditoría semántica de los paneles

Inspección autenticada en escritorio el 2026-11-21, con datos y rol de administrador presentes en esa sesión. El shell expone un `main`, navegación principal y enlace para saltar al contenido. No se inspeccionaron todos los roles, estados de datos o tamaños de pantalla.

## Correcciones aplicadas

- Dashboard: widgets como lista nombrada, carga anunciada como estado, títulos de widget `h2` y valores de métricas sin semántica de encabezado.
- Supervisión: navegación identificada, botones con estado seleccionado y títulos principales del resumen `h2`. Las filas de personas son botones nativos y las métricas seleccionables comunican su estado.
- Filas interactivas de dashboard y métricas seleccionables permiten activación por teclado. En navegador se abrió el detalle de turno con Enter y el expediente de una persona con Enter.
- El ADR enlazado en la spec establece un criterio transversal; no cambia automáticamente las demás vistas.

- Los diálogos `CinematicModal` y de expediente comparten aislamiento del fondo, gestión del foco y Escape; ambos se verificaron en navegador con restauración del foco.
- El visor de adjuntos y el diálogo de rechazo usan el comportamiento compartido mediante portales; sus pruebas cubren aislamiento, foco, Escape y restauración. El rechazo permanece abierto durante el envío.

## Ampliación de la revisión

- Con la sesión de administrador se recorrieron las seis secciones de supervisión y se comprobó que la navegación anuncia la sección activa. En Empleados se observó el estado vacío de solicitudes.
- Se solicitó un viewport de 390 × 844, pero el navegador informó un ancho efectivo de 433 píxeles: se comprobó ausencia de desbordamiento del documento a ese ancho en las seis secciones y en dashboard. Esto no equivale a una validación responsive completa.
- La sesión no tenía solicitudes pendientes, por lo que los diálogos de adjunto y rechazo se probaron mediante componentes, no mediante un flujo real en navegador.

## Hallazgos pendientes

- En Indicadores existen encabezados que saltan de `h2` a `h4` y filtros sin nombre accesible; en Turnos aparece un segundo `h1` y saltos en la jerarquía. Requieren una corrección y pruebas específicas.
- No se ejecutó una auditoría con lector de pantalla, responsive completa, otros roles ni todos los estados de carga, error y datos de las páginas.
