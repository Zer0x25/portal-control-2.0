# Plan 118: Corregir flujo `libro-novedades-medidores-y-comunicaciones`

## División de trabajo en paralelo (`/swarm`)

1. **Worker Backend (`lm-backend-fix`):**
   - `backend/src/models/schemas/report.schemas.ts`: agregar `ShiftReportQuerySchema` (`page`, `pageSize` 1..100, `since`, `status`, `search`, `date`), hacer `folio` opcional en `ShiftReportSchema`, y definir `ShiftReportPaginatedResponseSchema` (`{ data, total, page, totalPages }`).
   - `backend/src/modules/shiftReports/http/routes.ts` y `backend/src/modules/meters/http/routes.ts`: alinear roles a `["Administrador", "Supervisor_Elevado", "Reloj_Control"]`; validar `GET /api/shift-reports` con `ShiftReportQuerySchema`.
   - `backend/src/services/ShiftReportService.ts` y `backend/src/modules/shiftReports/application/normalizeEntries.ts`:
     - Implementar filtros `search` (folio, responsibleUser, shiftName) y `date` (`YYYY-MM-DD` en rango UTC) en `list`.
     - Hacer `folio` inmutable en actualizaciones.
     - Setear `deletedAt: new Date()` y mover `auditService.log` dentro de `withDirectTransaction` en `delete`.
     - Usar `America/Santiago` en `toTimeString` de `normalizeEntries.ts`.
   - `backend/src/services/export/ExportService.ts`, `StreamExportService.ts` y `backend/src/modules/importExport/http/routes.ts`:
     - Filtrar `isDeleted: false` (`findFirst({ where: { id, isDeleted: false } })`) en PDF y Excel.
     - Lanzar `NotFoundError` (`404`) en `generateShiftReportIndividualPDF` cuando no exista o esté eliminado.
     - Sanitizar `id` en `Content-Disposition` de `/api/export/shift-report-pdf/:id`.
   - `backend/src/modules/configs/` / `ConfigService`: asegurar que `communications_content` sea legible por roles autenticados que acceden a `#/communications` (incluyendo `Fiscalizador`) y editable solo por `Administrador`.
   - `backend/src/platform/openapi/operations.ts`: actualizar anotaciones de `/api/shift-reports` (query params y `ShiftReportPaginatedResponse`).
   - Reparar `backend/tests/unit/shiftReportService.test.ts` y `backend/tests/unit/importExportFlows.test.ts`, y añadir cobertura en `tests/fastify-integration/shiftReports.test.ts`, `importExport.test.ts`, `meters` y `configs`.

2. **Worker Frontend (`lm-frontend-fix`):**
   - `frontend/src/hooks/layout/sidebarMenu.ts`: condicionar `"Comunicados"` de `Fiscalizador` a `isControlInternoEnabled`.
   - `frontend/src/hooks/useMeterReadings.ts`, `frontend/src/services/meterService.ts`, `frontend/src/features/meters/`:
     - Enviar `timestamp: new Date().toISOString()` en `useMeterReadings.ts`.
     - Eliminar casts inseguros en `meterService.ts` (alineado con SDK).
     - `MeterConfigPanel.tsx`: `await updateMeterConfigs` con try/catch + toast, `aria-label` e `id` en controles.
     - `useMeterReadingsFormController.ts`: mostrar toast informativo si el formulario se envía sin valores.
     - `MeterHistory.view.tsx`: mostrar fallback `"Medidor eliminado"` en lugar de ocultar lecturas históricas.
   - `frontend/src/features/logbook/` y `frontend/src/services/shiftReportService.ts`:
     - Corregir `"Cerrar Guardía"` y mojibake en `Logbook.view.tsx`.
     - Corregir `handleUpdateShift` (relanzar error o propagar fallo) para evitar falso toast `"success"` y cierre de modal en `LogEntriesCard.tsx` y `SupplierEntriesCard.tsx`.
     - Invalidar `queryKeys.shiftReportsList` al cerrar turno y corregir deep-link `?id=` en `useLogbookData.ts`.
     - `ClosedReportsModal.tsx`: `enabled: isOpen`, filtros server-side (`search`, `date`), formateo de fechas con `formatDisplayDateTime`, `aria-label` en botones de icono.
   - `frontend/src/features/communications/`:
     - Migrar `useCommunicationsData.ts` a `configService.get("communications_content")` / `configService.set("communications_content", ...)` con estado `isSaving` y restauración de contenido en `"Descartar"`.
   - `frontend/src/features/dashboard/` (`QuickNotesModal`) y `noteService.ts` / `useQuickNotes.ts`:
     - Agregar botón `Archivar` en `QuickNotesModal.view.tsx` conectado a `archiveNote` (`PUT /api/notes/:id`).
     - Limpiar casts `as unknown as never` / `as unknown as QuickNote`.

3. **Integración, OpenAPI/SDK Sync y Verificación Staging:**
   - Regenerar `swagger.json` y `frontend/src/types/api-schema.ts` tras el commit de backend.
   - Reconstruir `portal-control-staging` y verificar flujo E2E en Playwright headless (`http://127.0.0.1:8080`).
