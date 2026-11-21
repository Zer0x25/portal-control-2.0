# Pendientes de accesibilidad del piloto

Seguimiento de [la auditoría](auditoria.md) y [las tareas](tasks.md). El alcance comprende Dashboard, Supervisión y las mejoras ya iniciadas en Bitácora. Registrar fecha, rol, dispositivo y resultado al cerrar cada punto; las comprobaciones automáticas no sustituyen una prueba manual.

- [ ] **Lector de pantalla:** recorrer títulos, navegación, estados, tablas y diálogos con un lector real; comprobar anuncios, orden, foco y retorno al cerrar. Registrar lector, navegador, páginas y hallazgos.
- [ ] **Otros roles:** repetir los recorridos disponibles para cada rol autorizado, registrando permisos, controles y diferencias. Usar cuentas de prueba existentes o un entorno aislado.
- [ ] **Estados y diálogos con datos:** verificar carga, error, vacío y contenido; recorrer adjuntos y rechazo con solicitudes de prueba, incluidos envío y errores. No modificar registros operativos para preparar escenarios.
- [ ] **Responsive y teclado:** completar la revisión de las secciones de Supervisión, Dashboard y Bitácora en móvil, tablet y escritorio; comprobar contenido recortado, desplazamientos deliberados, foco visible y operabilidad. La medición documentada es parcial.
- [ ] **Extensión transversal:** inventariar las demás vistas y priorizar su adopción del [ADR 0032](../../docs/adr/0032-semantica-paneles.md), con pruebas y seguimiento por vista antes de declarar la aplicación cubierta.

## Avances de esta revisión

- [x] Comprobar anchos efectivos de 355, 433, 853 y 1138 px en Dashboard, Bitácora y cuatro secciones de Supervisión con la sesión de administrador. El documento no desbordó; esta medición no cubre todos los estados ni garantiza que cada contenido interno sea visible.
- [x] Corregir en Indicadores el desbordamiento de los botones de período y comprobar sus cinco opciones a un ancho efectivo de 355 px.
- [x] El 2026-11-21, con rol administrador, medir Analytics y Reportes a anchos efectivos de 355, 853 y 1138 px; corregir el desbordamiento de los períodos de Reportes y comprobar las cinco opciones a 355 px. Las demás secciones siguen requiriendo revisión manual completa.
- [x] Hacer accesibles por teclado los selectores de mes de Indicadores y Reportes; comprobar en navegador Enter, Escape y devolución de foco, y con pruebas de componente la selección de mes.
- [x] El 2026-11-21, con rol administrador, abrir con Enter y cerrar con Escape los diálogos de nueva novedad, proveedor e historial de Bitácora; comprobar aislamiento y retorno de foco. A 355 px efectivos, axe WCAG 2 A/AA no reportó infracciones en los dos formularios en tema oscuro ni en historial vacío en ambos temas tras corregir contraste y hacer desplazable su tabla con teclado. No se enviaron formularios ni se probaron reportes existentes.
- [x] Verificar y corregir el calendario anidado del historial: diálogo nombrado, aislamiento del padre, foco y Escape independientes; corregir estructura de encabezados y contraste de días adyacentes. En administrador, a 355 px efectivos y tema oscuro, axe WCAG 2 A/AA no reportó infracciones en ese calendario. Falta verificar otros temas y lectores de pantalla.
- [x] Corregir el calendario compartido para deshabilitar «Hoy» y «Aplicar» cuando sus fechas exceden los límites y descartar selecciones sin aplicar al reabrir. Las restricciones se probaron por componentes; el descarte se comprobó también en el historial real sin guardar datos.
