# Tasks 118: Corregir flujo `libro-novedades-medidores-y-comunicaciones`

- [ ] T01 (Backend): Agregar `ShiftReportQuerySchema` (`page`, `pageSize` 1..100, `since`, `status`, `search`, `date`), `folio` opcional en `ShiftReportSchema` y `ShiftReportPaginatedResponseSchema` en `report.schemas.ts`.
- [ ] T02 (Backend): Alinear roles en `shiftReports/http/routes.ts` y `meters/http/routes.ts` (excluir `Supervisor`), y validar `GET /api/shift-reports` con `ShiftReportQuerySchema`.
- [ ] T03 (Backend): Implementar filtros `search`/`date`, inmutabilidad de `folio` en update, `deletedAt` + auditoría en TX en `ShiftReportService.ts`, y zona `America/Santiago` en `normalizeEntries.ts`.
- [ ] T04 (Backend): Filtrar `isDeleted: false` en `ExportService.generateShiftReportIndividualPDF` y `StreamExportService.streamShiftReportToExcel`, devolver `404 NotFoundError` en PDF y sanitizar `Content-Disposition`.
- [ ] T05 (Backend): Permitir lectura segura de `communications_content` en `configs` para roles autorizados de `#/communications` (incluyendo `Fiscalizador`) y escritura solo para `Administrador`.
- [ ] T06 (Backend): Actualizar `operations.ts` (query params y response schema) y reparar/ampliar tests unitarios e integración (`shiftReportService.test.ts`, `importExportFlows.test.ts`, `shiftReports.test.ts`, `importExport.test.ts`, `meters`).
- [ ] T07 (Sync): Sincronizar `swagger.json`, `api-schema.ts` y validar `npm run check:sdk`.
- [ ] T08 (Frontend): Corregir `sidebarMenu.ts` (`Fiscalizador` + `isControlInternoEnabled`).
- [ ] T09 (Frontend): Corregir `timestamp` ISO en `useMeterReadings.ts`, `MeterConfigPanel.tsx` (`await`, toast, `aria-label`/`id`), `useMeterReadingsFormController.ts` (feedback envío vacío), `MeterHistory.view.tsx` (medidor eliminado) y casts en `meterService.ts`.
- [ ] T10 (Frontend): Corregir `Logbook.view.tsx` (typo/mojibake), `useLogbookData.ts` + `LogEntriesCard.tsx` + `SupplierEntriesCard.tsx` (propagación de error, invalidación `shiftReportsList`, deep-link `?id=`), y `ClosedReportsModal.tsx` (`enabled: isOpen`, filtros server-side, `formatDisplayDateTime`, `aria-label`).
- [ ] T11 (Frontend): Migrar `useCommunicationsData.ts` a `/api/configs/communications_content` con `isSaving` y restauración en `"Descartar"`; agregar botón `Archivar` en `QuickNotesModal` y limpiar casts en `noteService.ts` / `useQuickNotes.ts`.
- [ ] T12 (QA/Staging): Ejecutar `validate:ci` / suites, `lint:budget`, `docs:check`, reconstruir `portal-control-staging` y verificar E2E en `http://127.0.0.1:8080`.
