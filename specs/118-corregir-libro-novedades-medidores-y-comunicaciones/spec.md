# Spec 118: Corregir flujo `libro-novedades-medidores-y-comunicaciones`

- **Flujo:** `libro-novedades-medidores-y-comunicaciones`
- **Estado:** En ejecución (Fase 3 SDD)
- **Fecha:** 2026-11-18
- **Decisiones de producto aprobadas:**
  - **1.A (Roles):** Mantener `#/logbook` y `#/meter-readings` restringidos a `Administrador`, `Supervisor_Elevado` y `Reloj_Control` (alineando `/api/shift-reports*` y `/api/meters*` en backend para excluir `Supervisor`), y corregir `sidebarMenu.ts` / `App.tsx` para que `Fiscalizador` solo vea `#/communications` cuando `isControlInternoEnabled` esté activo y pueda acceder sin errores de permisos.
  - **2.A (Comunicaciones compartidas):** Migrar `#/communications` (`communications_content`) a persistencia compartida en backend mediante `/api/configs/:key` (lectura para roles autorizados de la ruta incluyendo `Fiscalizador`, escritura para `Administrador`), manteniendo fallback/migración segura sin romper el flujo, además de corregir el botón `"Descartar"` e indicador `isSaving`.
  - **3.A (Filtros server-side y Archivar notas):** Agregar filtros server-side (`search` y `date`) en `GET /api/shift-reports` para `ClosedReportsModal`, y agregar botón `Archivar` en `QuickNotesModal` conectado a `PUT /api/notes/:id`.

## Requisitos Funcionales y Contratos

1. **Contratos y Validación Backend (`shiftReports`, `meters`, `notes`, `importExport`, `configs`):**
   - **Query de `GET /api/shift-reports`:** Reemplazar `z.unknown()` por un schema Zod estricto (`ShiftReportQuerySchema`: `page` entero `>= 1`, `pageSize` entero `1..100`, `since` vía `epochQuery`, `status` `open | closed`, `search` string opcional trim, `date` `YYYY-MM-DD` opcional) y alinear `operations.ts` + `ShiftReportListResponseSchema` + `api-schema.ts` al shape real `{ data, total, page, totalPages }`.
   - **Creación/Edición de `ShiftReport`:** Hacer `folio` opcional en `ShiftReportSchema` de entrada (autogenerado en creación e inmutable en actualización para evitar colisiones `P2002`).
   - **Soft-delete y auditoría:** `ShiftReportService.delete` debe persistir `isDeleted: true` junto con `deletedAt: new Date()` y registrar `auditService.log` dentro de `withDirectTransaction`.
   - **Zona horaria en entradas legacy:** `normalizeShiftReportEntries` (`toTimeString`) debe formatear horas/minutos en `America/Santiago` (no hora local del proceso).
   - **Exportación PDF y Excel de reportes de turno:**
     - `ExportService.generateShiftReportIndividualPDF` y `StreamExportService.streamShiftReportToExcel` deben filtrar `isDeleted: false`.
     - Si el reporte no existe o está eliminado, `generateShiftReportIndividualPDF` debe lanzar `NotFoundError` (`404`).
     - Sanitizar `filename` en `Content-Disposition` de `GET /api/export/shift-report-pdf/:id` (evitar inyección de headers/CRLF/caracteres especiales).
   - **Roles backend:** Restringir `/api/shift-reports*` y `/api/meters*` a `["Administrador", "Supervisor_Elevado", "Reloj_Control"]` (consistente con `POST /api/shift-reports/:id/attendance-novelties` y frontend).
   - **Config de Comunicados (`configs`):** Habilitar lectura segura de la clave `communications_content` en `/api/configs/:key` para roles autorizados (incluyendo `Fiscalizador`), devolviendo `null` o `{ value: "" }` si aún no existe, y escritura exclusiva para `Administrador`.
   - **Tests unitarios base:** Reparar `tests/unit/shiftReportService.test.ts` (mock de `tx.$executeRaw`) y `tests/unit/importExportFlows.test.ts` (alinear expectativa con el error/permiso real).

2. **Medidores (`#/meter-readings` y `POST /api/meters/bulk`):**
   - **Contrato `timestamp`:** `useMeterReadings.ts` debe enviar `timestamp` en formato ISO string (`new Date().toISOString()`) conforme a `MeterReadingSchema`, eliminando `as unknown as SDKMeterReading[]` y casts `as unknown as` en `meterService.ts`.
   - **UI/UX Medidores:**
     - `MeterConfigPanel.tsx`: esperar (`await`) `updateMeterConfigs` con manejo de error/toast, y agregar `aria-label` e `id` en botones de cierre/acción y `<select>` del formulario.
     - `useMeterReadingsFormController.ts`: mostrar feedback (`addToast`) cuando se intenta guardar sin ingresar lecturas.
     - `MeterHistory.view.tsx`: no ocultar silenciosamente lecturas cuyo `meterConfigId` ya no exista en `meterConfigs` (mostrar etiqueta de fallback como `"Medidor eliminado"`).

3. **Libro de Novedades (`#/logbook`):**
   - **Textos:** Corregir `"Cerrar Guardía"` -> `"Cerrar Guardia"` y el mojibake en `ConfirmationModal` (`"¿Está seguro..."`, `"Sí, Cerrar Turno"`).
   - **Manejo de errores e invalidación:** `useLogbookData.ts` debe relanzar errores en `handleUpdateShift` (o retornar boolean) para que `LogEntriesCard` y `SupplierEntriesCard` **no** muestren toast `"success"` ni cierren el modal si la petición falla; `executeCloseShift` debe invalidar `queryKeys.shiftReportsList` para refrescar `ClosedReportsModal`.
   - **Deep-link `?id=`:** Cargar el reporte específico de forma confiable (vía filtro o fetch dedicado / sin limitarlo a `pageSize: 1`) y manejar errores con `.catch()`.
   - **Casts:** Eliminar `as unknown as BinaryResponse` en `shiftReportService.ts` si el tipo SDK lo permite o tipar el wrapper limpiamente.
   - **`ClosedReportsModal.tsx`:**
     - Pasar `enabled: isOpen` a `useShiftReportsInfinite` para no consultar al backend mientras el modal está cerrado.
     - Enviar `search` y `date` como filtros server-side a `GET /api/shift-reports`.
     - Formatear `startTime` y `endTime` con `formatDisplayDateTime` (Chile) en lugar de ISO crudo.
     - Agregar `aria-label` en botones de icono (limpiar búsqueda, ver detalle, PDF, Excel).

4. **Comunicaciones (`#/communications`) y Notas Rápidas (`QuickNotesModal`):**
   - **Acceso y Sidebar:** En `sidebarMenu.ts`, condicionar `"Comunicados"` para `Fiscalizador` a `isControlInternoEnabled`. Verificar que `Fiscalizador` pueda entrar a `#/communications` y leer el comunicado desde `/api/configs/communications_content` sin errores 403 ni toasts de acceso denegado.
   - **Persistencia y UI de Comunicaciones:**
     - `useCommunicationsData.ts` debe leer y guardar `communications_content` vía `configService` (`/api/configs/communications_content`), exponiendo `isSaving` y `initialContent` para que `"Descartar"` restaure el último contenido guardado y `"Publicar Cambios"` se deshabilite mientras guarda.
   - **Notas Rápidas (`QuickNotesModal` y `noteService.ts`):**
     - Agregar botón `Archivar` en `QuickNotesModal.view.tsx` conectado a `archiveNote` (`PUT /api/notes/:id`), con confirmación o feedback claro.
     - Eliminar casts `as unknown as never` / `as unknown as QuickNote` en `noteService.ts` y `useQuickNotes.ts` tras sincronizar OpenAPI/SDK.

## Criterios de aceptación

- [x] `POST /api/meters/bulk` desde la UI de `#/meter-readings` responde `201` sin error de validación `timestamp`.
- [x] `GET /api/shift-reports` rechaza `page=abc`, `page=-1`, `pageSize=99999` con `400 VALIDATION_ERROR` y soporta `search` y `date` server-side.
- [x] `GET /api/export/shift-report-pdf/:id` y `GET /api/shift-reports/export/:id` devuelven `404` tanto para IDs inexistentes como para reportes soft-deleted (`isDeleted: true`), y `DELETE /api/shift-reports/:id` setea `deletedAt`.
- [x] `Supervisor` recibe `403` en `/api/shift-reports*` y `/api/meters*`; `Fiscalizador` ve `"Comunicados"` solo con `isControlInternoEnabled` activo y lee `#/communications` sin toast de error.
- [x] En `#/logbook`, un fallo `500` al guardar novedad/proveedor no muestra toast de éxito ni cierra el modal; `ClosedReportsModal` no consulta cerrada, formatea fechas y filtra server-side; los textos sin mojibake ni typos.
- [x] En `#/communications`, editar y pulsar `"Descartar"` restaura el texto guardado; publicar persiste en backend y es visible tras recargar o con otro usuario autorizado.
- [x] En `QuickNotesModal`, existe botón para archivar notas (`PUT /api/notes/:id`).
- [x] `npm run check`, `npm run check:sdk`, `npm run lint:budget` (0/0), `npm run docs:check`, tests unitarios e integración en PostgreSQL 18.4, y verificación en staging (`http://127.0.0.1:8080`) pasan sin regresiones.
