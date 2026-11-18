# Tasks 115: Corregir permisos, ausencias y feriados

- [ ] **T1 (Prisma):** Agregar `isRenounceable Boolean @default(false) @map("is_renounceable")` en `Holiday`, crear migración `--create-only`, auditar SQL y regenerar cliente Prisma.
- [ ] **T2 (Backend Holidays):** Soportar `isRenounceable` en CRUD/sync (`!item.inalienable`), actualizar por `id` en edición (permitiendo cambiar fecha, `409` en duplicado, `404` si `id` no existe), y restringir escritura a `Administrador | Supervisor_Elevado | Supervisor`.
- [ ] **T3 (Backend Leaves):** Separar permisos lectura (`Reloj_Control`, `Fiscalizador` incluidos) vs escritura (`Administrador | Supervisor_Elevado | Supervisor`), preservar `endDate` en `DELETE /api/leaves/:id`, y agregar `type`/`search` en `GET /api/leaves`.
- [ ] **T4 (Backend Tests):** Actualizar y ampliar tests unitarios e integración Fastify + PostgreSQL 18.4 (`holidays.test.ts`, `leavesCorrections.test.ts`, `holidayService*.test.ts`).
- [ ] **T5 (Frontend Leaves):** Quitar doble `POST` (`justifyRecordsForLeave`) en `useLeaveManagerController`, invalidar `timeRecords` en `useLeaveMutations`, y conectar filtros `type`/`search` a `useLeavesInfiniteQuery`.
- [ ] **T6 (Frontend Holidays):** Corregir `HolidaySyncResult` y toast de `syncHolidays`, y exponer `isRenounceable` en `HolidayForm`, `useHolidayManagerController` y listas desktop/mobile.
- [ ] **T7 (OpenAPI/SDK & Verificación):** Sincronizar `swagger.json` + SDK (`npm run check:sdk`), pasar `check`/`lint`/`lint:budget`/`docs:check`, pruebas backend/frontend y verificación Playwright en staging.
