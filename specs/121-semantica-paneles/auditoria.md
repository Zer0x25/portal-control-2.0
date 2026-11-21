# Auditoría semántica de los paneles

Inspección autenticada en escritorio el 2026-11-21, con datos y rol de administrador presentes en esa sesión. El shell expone un `main`, navegación principal y enlace para saltar al contenido. No se inspeccionaron todos los roles, estados de datos o tamaños de pantalla.

## Correcciones aplicadas

- Dashboard: widgets como lista nombrada, carga anunciada como estado, títulos de widget `h2` y valores de métricas sin semántica de encabezado.
- Supervisión: navegación identificada, botones con estado seleccionado y títulos principales del resumen `h2`. Las filas de personas son botones nativos y las métricas seleccionables comunican su estado.
- Filas interactivas de dashboard y métricas seleccionables permiten activación por teclado. En navegador se abrió el detalle de turno con Enter y el expediente de una persona con Enter.
- El ADR enlazado en la spec establece un criterio transversal; no cambia automáticamente las demás vistas.

- Los diálogos `CinematicModal` y de expediente comparten aislamiento del fondo, gestión del foco y Escape; ambos se verificaron en navegador con restauración del foco.
- El visor de adjuntos y el diálogo de rechazo usan el comportamiento compartido mediante portales; sus pruebas cubren aislamiento, foco, Escape y restauración. El rechazo permanece abierto durante el envío.
- Indicadores: los tres filtros tienen etiquetas asociadas y los títulos de métricas usan `h2`. Turnos: se corrigió el segundo `h1` y el historial de cierres usa el diálogo compartido; en navegador se verificaron foco, aislamiento, Escape y retorno al botón.
- Bitácora: en móvil las novedades y los ingresos de proveedores son listas nombradas; sus títulos siguen la jerarquía de la página. El aviso de cierre de sesión se anuncia como diálogo de alerta, aísla el fondo y mantiene su comportamiento no cancelable. Este aviso se verificó con pruebas de componentes sin cerrar una guardia real.
- Las cargas de Bitácora y solicitudes se anuncian como estado; en solicitudes los filtros indican cuál está seleccionado. Indicadores anuncia errores de fechas y ausencia de datos. Estas situaciones se cubrieron con pruebas de componentes.
- Con la sesión de administrador y los datos disponibles se ejecutó axe-core sobre el `main` de dashboard, Bitácora y las secciones Resumen, Indicadores, Empleados y Turnos de supervisión, con las reglas etiquetadas WCAG 2 A/AA en temas claro y oscuro. Se corrigieron contrastes detectados y la revisión final no reportó infracciones en esos estados; no es una certificación WCAG ni cubre la aplicación completa.

## Ampliación de la revisión

- Con la sesión de administrador se recorrieron las seis secciones de supervisión y se comprobó que la navegación anuncia la sección activa. En Empleados se observó el estado vacío de solicitudes.
- Se solicitó un viewport de 390 × 844, pero el navegador informó un ancho efectivo de 433 píxeles: se comprobó ausencia de desbordamiento del documento a ese ancho en las seis secciones y en dashboard. Esto no equivale a una validación responsive completa.
- La sesión no tenía solicitudes pendientes, por lo que los diálogos de adjunto y rechazo se probaron mediante componentes, no mediante un flujo real en navegador.

## Hallazgos pendientes

- No se ejecutó una auditoría con lector de pantalla, responsive completa, otros roles ni todos los estados de carga, error y datos de las páginas. El detalle y los criterios de cierre están en [pendientes.md](pendientes.md).
- Una medición posterior a anchos efectivos de 355, 433, 853 y 1138 px identificó que los botones de período de Indicadores excedían el área principal en móvil, aunque el documento no desbordaba. Se permitió que los botones ocupen varias líneas y se comprobaron las cinco opciones a 355 px. La navegación horizontal de Supervisión conserva su desplazamiento deliberado.
- Analytics y Reportes se midieron también a 355, 853 y 1138 px efectivos; Reportes presentaba el mismo desbordamiento de períodos y fue corregido. Los selectores de mes de Indicadores y Reportes ahora son botones con estado expandido, apertura por teclado, cierre con Escape y retorno del foco. Se verificaron apertura y cierre en navegador y selección en pruebas de componentes.
- Bitácora: los diálogos de nueva novedad, proveedor e historial abren con Enter, aíslan el fondo y cierran con Escape devolviendo el foco. A 355 px efectivos, axe no reportó infracciones WCAG 2 A/AA en los dos formularios en tema oscuro; en el historial vacío se corrigieron contraste y acceso por teclado al desplazamiento horizontal, comprobados en temas claro y oscuro. Los formularios no se enviaron y no había reportes cerrados disponibles.
- El calendario del filtro de historial carecía de semántica y gestión propia del foco. Se integró al comportamiento compartido de modales apilados y se corrigió la estructura y contraste de su cuadrícula. En navegador se comprobó aislamiento del historial, Tab dentro del calendario y cierre independiente con Escape; axe no reportó infracciones WCAG 2 A/AA en el estado móvil oscuro inspeccionado.
- El calendario compartido permitía elegir «Hoy» fuera del rango y conservaba una selección cancelada al reabrir. Se deshabilitan fechas no permitidas para las acciones de hoy y aplicar, y se reinicia el estado al abrir con la fecha vigente. Se verificó por componentes y el descarte también en navegador.
- Con una fecha seleccionada en el calendario del historial se verificaron flecha derecha y Enter, y se corrigió el contraste de la fecha y del botón «Aplicar». En los temas claro y oscuro a 355 px efectivos, axe no reportó infracciones WCAG 2 A/AA en el estado inspeccionado tras las transiciones.
