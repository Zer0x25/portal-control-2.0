# Spec 021: Importación y exportación

- Estado: Implementada y validada localmente
- Fecha: 2026-10-06
- Ruta: [roadmap](../roadmap-fastify.md)

## Problema

ImportController mezcla ExcelJS, mapping y HTTP; exportController mezcla validación,
scope y renderers. Cinco rutas faltan en Fastify. Extraer flujos compartidos con
puertos permite probar reglas sin servidor y mantener contratos observables.

## Alcance y contrato (PRD/SDD)

| Método | Path                             | Permiso                                        | Validación                                                                                                | Respuesta / efectos                                                                                                                                      |
| ------ | -------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /api/import/preview              | Supervisor, Admin, Sup. elevado, Reloj_Control | multipart file único hasta 50 MiB; archivo requerido; decode Excel; mapping JSON opcional                 | 200 rows/total; sin escritura de negocio; missing/corrupt/sin hojas 400; exceso 413; mapping inválido 500                                                |
| GET    | /api/export/calendar-pdf         | Sesión; Usuario solo employeeId propio         | ExportQuerySchema router + schema controller regex fechas/viewMode/month y mode summary/compiled_detailed | 200 PDF buffer y Content-Length; Usuario limpia area/cargo; denegación error 403                                                                         |
| GET    | /api/export/report-pdf           | Sesión; Usuario solo employeeId propio         | Mismos dos schemas                                                                                        | 200 PDF; Usuario limpia area/cargo/mode; denegación 403 solo message                                                                                     |
| GET    | /api/export/shift-report-pdf/:id | Supervisor, Admin, Sup. elevado, Reloj_Control | ID requerido                                                                                              | 200 PDF; inexistente mantiene 500 de servicio                                                                                                            |
| GET    | /api/export/report-excel         | Sesión; Usuario solo employeeId propio         | Schema router fuera de catch; schema controller dentro de catch                                           | 200 XLSX Writable; autorización/schema controller 500 EXPORT_REPORT_EXCEL_ERROR; fallo renderer antes/después de bytes conserva JSON/finalización legacy |

No exponer PIN, no escribir empleados/registros durante preview/export. Los permisos de usuarios consultan sesión persistida; token Kiosk_Employee
conserva autenticación sin sesión y scope legacy. Quiosco conserva permisos de token para
calendar/report/Excel, sin restricción Usuario equivalente; pendiente decisión.
Unknown query fields se validan sin reemplazar query; schema del controller sí
proyecta y asigna viewMode month. mode detailed pasa router pero falla controller:
400 PDF / 500 Excel. compiled_detailed se conserva sin traducir; Excel no utiliza
mode. Usuario Excel mantiene area heredada, cargo no se reenvía al renderer.

Aplicación pura con parseMapping/readWorkbook/parseFilters/pdf/excel inyectados;
Uint8Array, estructura de hoja neutral y sink genérico. index.ts como API pública.
readImportWorkbook conserva ExcelJS: primera hoja, cabecera fila 1, filas/celdas
no vacías, valor raw (incluye fórmulas/rich text), String mapping con null intacto.
Único cast upstream XlsxLoadBuffer se mueve del controller a este decoder.
PDF sigue buffer; Excel mantiene streaming, sin casts Express.Response. Un presupuesto
compartido de exportaciones limita diez solicitudes por IP en quince minutos antes
de mantenimiento/auth, incluidos fallos/anonimato; 429 solo message y Retry-After.
Renderer
existente conserva consultas/reloj y lógica; no replica queries por día de calendario.

## Límites y deudas explícitas

- Preview carga workbook en memoria: 50 MiB limita archivo comprimido, no expansión
  ZIP, número de filas o costo de parseo. Sin filtro MIME/extensión, heredado.
- Mapping JSON sin validación estructural; JSON inválido/prop nula mantiene 500;
  valores complejos se exponen como objetos ExcelJS. No se agrega import persistente.
- Dos schemas dispares, fechas regex sin orden/calendario y Excel con catch que
  oculta 400/403. No corregir silenciosamente estos contratos durante migración.
- PDF calendario conserva consultas por día y límites UTC/local del renderer;
  renderers cargan datasets en memoria, XLSX individual/materialización KPI no
  obtiene garantía de memoria constante. Sin benchmark, no afirmar rendimiento.
- Multipart Fastify mantiene defaults de fields/parts propios; límite 50 MiB es
  por archivo, no payload agregado. Normal JSON mantiene 1 MiB. Segundo file y
  campo inesperado rechazados antes de decoder. Campos schema repetidos se rechazan
  como JSON inválido, igual que coerción array heredada.
- WorkbookWriter empieza ZIP antes de resolver KPI; fallo real de KPI devuelve
  200 ZIP parcial sin directorio final, caracterizado. Fallo antes de cualquier
  byte devuelve 500 con auditoría de error; después de bytes devuelve descarga parcial con status confirmado;
  conservar fin de stream, no segunda respuesta ni nuevos sockets/jobs.

Fuera: despliegues, cutover, cambios DB/stack, nuevos modos o permisos de producto,
refactor de renderers/scheduler, staging/carga/e2e. Express sigue principal.

## Criterios de aceptación

- [x] AC1: Inventario no vacío de cinco rutas con permisos, validación, respuestas y efectos.
- [x] AC2: BDD concreto y cuatro pruebas RED previas a implementación.
- [x] AC3: Puertos tipados, API pública y aplicación sin servidor/DB/reloj.
- [x] AC4: Paridad, permisos, fallos y renderers reales sobre PostgreSQL aislado.
- [x] AC5: Gates backend/frontend secuenciales, SDK/docs/ratchets y rollback documentados.

## Trazabilidad

Dependencia 020 commit 64ba38b; [plan](plan.md), [BDD](behavior.md), [tareas](tasks.md).
Constitución I–V, Node 26, React/Vite/PostgreSQL y withDirectTransaction conservados.
