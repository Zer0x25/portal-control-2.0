# Exportación de reportes legacy

Contrato correctivo posterior a [025](spec.md), para la deuda de 017.

Listado, guardado y exportadores XLSX/PDF comparten la normalización expuesta
por la API pública de `modules/shiftReports`. Se conserva el comportamiento
existente del listado: JSON inválido o una colección no-array equivale a una
colección vacía; entradas incompletas reciben los mismos defaults y aliases
(`detail`, `notes`, `message`). Cada colección conserva orden por timestamp.

La corrección evita errores 500 al exportar contenido legacy corrupto. No
reescribe el almacenamiento, no cambia permisos ni errores de reporte ausente,
headers de descarga o formato de los documentos. Se conserva también el fallback
horario del host: corregirlo exige un contrato de fechas independiente.

Pruebas compartidas Express/Fastify cargan el XLSX producido, comparan su cantidad
de filas con el listado y verifican celdas recuperadas. PDF se prueba con JSON
inválido, colecciones no-array y entradas incompletas, comprobando respuesta,
firma PDF y headers. Estas pruebas no verifican la presentación visual del PDF.
