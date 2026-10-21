# Tareas 036: Frontend Form & Table Primitives

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## Fase A — Capa de formulario

- [ ] T1: Añadir `@tanstack/react-form`, `@tanstack/form-resolvers` y
      `@tanstack/react-table` (runtime) a `frontend/package.json` (AC1).
- [ ] T2: Crear `frontend/src/hooks/useAppForm.ts`: wrapper de TanStack Form
      con resolver de Zod, `mode: "onSubmit"` con revalidación `onChange`
      tras el primer submit, normalización de `values` (`trim`, `undefined` →
      `null` en opcionales) antes del submit, foco al primer campo inválido,
      `isSubmitting` expuesto y helper `withSubmitGuard(ref)` con el **ref
      sincrónico** anti-doble-submit (AC1, AC4).
- [ ] T3: Crear `frontend/src/utils/errorMessages.ts` con el mapa central de
      mensajes de error en español (RUT, contraseña, rango horario, fecha,
      requerido, duplicado) para que el mismo error se exprese igual en todos
      los formularios (AC2).
- [ ] T4: Extender `components/ui/{Input,Select,Textarea,Checkbox,Switch}.tsx`
      con props **adicionales** de error (`aria-invalid`, `aria-describedby`,
      `errorMessage`) unificadas y `htmlFor` obligatorio; **sin romper** las
      props existentes (AC3).

## Fase B — Schemas de formulario

- [ ] T5: Crear `frontend/src/schemas/forms/*.ts` con un schema Zod de
      **entrada de usuario** por formulario de negocio, derivado de las
      reglas del backend (`backend/src/modules/<dominio>/schemas.ts`) y
      **reutilizando** los tipos de `src/types/api-schema.ts`
      (`components["schemas"]`) en lugar de duplicar el contrato (AC2).
- [ ] T6: Documentar la distinción entre `src/types/schemas.ts` (27 schemas
      de validación de IndexedDB para la cola offline, **se mantiene**) y los
      nuevos schemas de formulario (entrada de usuario) (AC2).
- [ ] T7: Crear `frontend/src/tests/contracts/form-backend-parity.test.ts`:
      por cada schema de formulario, una batería de casos límite (RUT
      chileno válido y con dígito verificador incorrecto, contraseña por
      debajo del mínimo, hora fuera del rango de jornada, fecha en la zona
      horaria del negocio, campo opcional ausente vs cadena vacía) que
      compara el resultado del schema de frontend con la regla del backend;
      el test falla si divergen (AC2).

## Fase C — Migración de formularios (5 PR)

- [ ] T8: Migrar `theoretical-shifts`: `src/hooks/useShiftPatternForm.ts`
      (450 líneas), `src/hooks/useShiftAssignmentForm.ts` (233) y
      `features/theoretical-shifts/components/HolidayForm.tsx` (130) a
      `useAppForm` + schema (AC1, AC2).
- [ ] T9: Migrar `employee-management`: `EmployeeForm.tsx` (321),
      `ImportModal.tsx` (283), `ShiftHistoryModal.tsx` (276) (AC1, AC2).
- [ ] T10: Migrar `configuration`: `SmtpConfigModal.tsx` (427),
      `SeedingOptionsModal.tsx` (275), `SeedingProgressModal.tsx` (353)
      (AC1, AC2).
- [ ] T11: Migrar `logbook`: `AddSupplierModal.tsx` (273),
      `ClosedReportsModal.tsx` (308), `AddNoveltyModal.tsx` (144) (AC1, AC2).
- [ ] T12: Migrar `meters`, `user-management`, `governance`, `auth` y
      `supervisor-dashboard`: `MeterForm.tsx` (189), `MetersModal.tsx` (210),
      `SingleMeterInputModal.tsx` (134), `UserForm.tsx` (170),
      `ExportLogsModal.tsx` (161), `MFASetupModal.tsx` (161),
      `MFALoginModal.tsx` (114), `RejectionReasonModal.tsx` (112) (AC1, AC2).
- [ ] T13: Verificar en cada migración que el **payload enviado al backend es
      idéntico** al anterior (mismo shape, mismos nombres de campo) y que el
      e2e del flujo correspondiente queda en verde (AC8).

## Fase D — Capa de data grid (3 PR)

- [ ] T14: Crear `frontend/src/components/ui/DataTable.tsx`,
      `DataTableHeader.tsx` y `DataTableRow.tsx`: primitivas headless sobre
      TanStack Table, con el diseño actual (tokens `token-*`, tipografía
      `typo-ui-*`, densidad industrial) y **accesibilidad de tabla**:
      `role="grid"`, `aria-rowcount`, `aria-colcount`, cabeceras ordenables
      como `<button>` con `aria-sort` y nombre accesible, navegación por
      teclado (AC5, AC6).
- [ ] T15: Extraer el cálculo de **subtotales** de `ReportTable.tsx` a una
      función pura `frontend/src/utils/reportSubtotals.ts` y crear
      `frontend/src/hooks/useReportTable.ts` con el estado de sort/paginación;
      escribir el test unitario de la función pura **antes** de migrar el
      componente (AC5).
- [ ] T16: Reescribir `frontend/src/components/ui/ReportTable.tsx` (549
      líneas) sobre las primitivas nuevas e integrar
      `SortableHeader.tsx` (59) y `PaginationControls.tsx` (98) en
      `DataTableHeader`/`DataTable` sin duplicarlos; conservar la bifurcación
      desktop/mobile (`ReportTableMobileSummaryCard` +
      `ReportTableMobileDailyCard` vía `ResponsiveView`) (AC5).
- [ ] T17: Si `ReportTable.tsx` se renombra o se mueve, actualizar
      `frontend/design-system-certified.json` **en el mismo PR** y verificar
      la paridad con `frontend/scripts/audit-design-system.cjs` (AC5).
- [ ] T18: Evaluar caso por caso la migración a la primitiva de
      `features/time-control/components/TimeRecordRow.tsx` (327),
      `features/governance/components/AuditLogFilterPanel.tsx` (457) y
      `AuditLogsView.tsx` (405), `IntegrityAnomalyTable.tsx`; migrar **solo**
      donde la primitiva encaja y **documentar** las excepciones (AC5, AC7).

## Fase E — Guardrails

- [ ] T19: Crear `frontend/src/tests/guardrails/formTableGuardrails.test.ts`:
      (a) componentes con `useState` de `values`/`errors` de formulario en
      `features/` → whitelist con **budget decreciente** inicializado al
      conteo real medido (baseline: 18); (b) componentes que declaran
      `sortConfig`/`requestSort` → deben usar la primitiva de tabla o estar
      en la whitelist; (c) toda tabla ordenable expone `aria-sort`; registrar
      el guardrail en `frontend/package.json` (`test:guardrails` y
      `lint:guardrails`) (AC7).
- [ ] T20: Crear `frontend/src/tests/tables/report-table.a11y.test.ts` con
      axe-core sobre la tabla: sin violaciones nuevas, `aria-sort` correcto en
      los 3 estados y navegación por teclado operativa (AC6).
- [ ] T21: Extender `frontend/e2e/a11y.spec.ts` con la tabla de reportes en
      claro y oscuro (AC6).

## Verificación final

- [ ] T22: Actualizar la documentación: `frontend/src/features/README.md`
      (los hooks de formulario viven en `features/<dominio>/hooks/` y usan
      `useAppForm`), `.agents/rules/design-system-governance.md` (sección
      "Formularios y tablas" con el contrato de la capa) y
      `.agents/rules/frontend-performance.md` (invariante 5 ampliada: la
      protección anti-doble-submit la provee la capa de formulario) (AC8).
- [ ] T23: Suite completa verde: `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` y `npm run e2e:staging` (56 tests, incluidos los
      flujos de formulario: alta/edición de empleados, alta de reportes de
      turno, configuración SMTP, cambio de contraseña y MFA) (AC8).
- [ ] T24: Promover `docs/adr/0025-frontend-form-table-primitives.md` de
      "Propuesto" a "Aceptado" con las líneas de implementación verificadas;
      actualizar la tabla de `docs/adr/README.md` en el mismo commit; marcar
      el spec como "Implementado" (AC8).
