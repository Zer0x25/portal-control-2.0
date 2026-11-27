# Tasks 123: Renamespace de roles

- [x] T1: Crear spec, plan, tasks y ADR-0034 (AC1)
- [x] T2: Renombrar enum en `schema.prisma` y generar migración
      `--create-only`; auditar SQL (AC1)
- [x] T3: Aplicar migración a dev DB y regenerar Prisma client (AC1, AC2)
- [x] T4: Reemplazar referencias en `backend/src`, seeds y scripts con
      orden seguro de renombre (AC3)
- [x] T5: Reemplazar referencias en `frontend/src` y `frontend/e2e` (AC3)
- [x] T6: Actualizar pruebas backend y frontend al nuevo vocabulario (AC3)
- [x] T7: Regenerar swagger + SDK y verificar `check:sdk` (AC4)
- [x] T8: Validar: `validate:ci` backend y frontend, `spec:check`,
      `docs:check`, lint budget (AC5)
- [x] T9: Completar ADR-0034 y actualizar índice de ADRs
