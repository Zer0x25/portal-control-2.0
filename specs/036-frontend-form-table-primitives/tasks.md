# Tareas 036: Frontend Form & Table Primitives

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## Fase A — Capa de formulario

- [ ] T1: Añadir `@tanstack/react-form` y `@tanstack/react-table` (runtime) a
      `frontend/package.json`. **No** añadir `@tanstack/form-resolvers`: ese
      paquete **no existe** en npm (404 en el registry) y no hace falta,
      porque `@tanstack/react-form` v1 consume **Standard Schema** y
      `zod ^4.6.5` (ya instalado) es Standard Schema nativo (AC1).
- [ ] T2: Crear `frontend/src/hooks/useAppForm.ts`: wrapper de TanStack Form
      con el schema Zod pasado **directamente** en el campo `validators`
      (soporte Standard Schema), con `mode: "onSubmit"` y revalidación
      `onChange` tras el primer submit, normalización de `values` (`trim`,
      `undefined` → `null` en opcionales) antes del submit, foco al primer
      campo inválido, `isSubmitting` expuesto y helper `withSubmitGuard(ref)`
      con el **ref sincrónico** anti-doble-submit (AC1, AC4).
- [ ] T3: Crear `frontend/src/utils/errorMessages.ts` con el mapa central de
      mensajes de error en español (RUT, contraseña, rango horario, fecha,
      requerido, duplicado) para que el mismo error se exprese igual en todos
      los formularios (AC2).
- [ ] T4: Arreglar la a11y de error en `components/ui/`. **No** se introduce
      una prop `errorMessage`: `Input.tsx:5`, `Select.tsx:11`, `Textarea.tsx:5`
      y `Checkbox.tsx:5` **ya** aceptan `error?: string` y ya calculan
      `aria-invalid` y `aria-describedby`. El defecto real es que
      `Input.tsx:25` y `Textarea.tsx:24` dependen de que el consumidor pase
      `id` (`aria-describedby={error && id ? ... : undefined}`) mientras que
      `Select.tsx:17` y `Checkbox.tsx:10` ya usan `useId()` como fallback.
      Añadir ese **fallback `useId()`** a `Input`, `Textarea` y `Switch` (que
      además no tiene `label` ni `error`), de modo que `id`, `htmlFor` y
      `aria-describedby` quedan garantizados en el 100 % de los casos, sin
      romper ninguna prop existente (AC3).

## Fase B — Schemas de formulario

- [ ] T5: Crear `frontend/src/schemas/forms/*.ts` con un schema Zod de
      **entrada de usuario** por formulario de negocio, derivado de las
      reglas del backend (`backend/src/models/schemas/*.schemas.ts`,
      re-exportados por `backend/src/models/schemas.ts` — **no**
      `backend/src/modules/**/schemas`, que no existe) y **reutilizando** los
      tipos de `src/types/api-schema.ts` (`components["schemas"]`) en lugar
      de duplicar el contrato (AC2).
- [ ] T6: Documentar la distinción entre `src/types/schemas.ts` (27 schemas
      de validación de IndexedDB para la cola offline, **se mantiene**) y los
      nuevos schemas de formulario (entrada de usuario), y registrar la
      **divergencia deliberada** del dígito verificador de RUT: el frontend
      lo valida (`EmployeeForm.tsx:78-97`) y el backend no
      (`employee.schemas.ts:6` solo exige `min(8)`) (AC2).
- [ ] T7: Crear `frontend/src/tests/contracts/form-schema-parity.test.ts`:
      por cada schema de formulario, una batería de casos límite (contraseña
      por debajo del mínimo, hora fuera del rango de jornada, fecha en la
      zona horaria del negocio, campo opcional ausente vs cadena vacía)
      comparando el resultado del schema de frontend con el del backend; el
      test falla si divergen. **El backend NO se importa**: la comparación
      se hace contra el artefacto de contrato compartido
      `backend/docs/swagger.json` (`required`, `minLength`, `maxLength`,
      `pattern`, `enum`, `minimum`/`maximum`) y contra **fixtures doradas**
      versionadas (`frontend/src/tests/contracts/cases/*.json`) para las **19
      reglas `.refine()`** del backend, que no son expresables en OpenAPI.
      Esto mantiene el aislamiento de paquetes: `frontend/tsconfig.json`
      incluye solo `src` y `@asteasolutions/zod-to-openapi` solo está
      instalado en `backend/` (AC2).

## Fase C — Migración de formularios (5 PR, por riesgo)

**Invariante de la spec 033**: el `useAppForm` se instancia en el **hook de
dominio / controller** (`features/<dominio>/hooks/use*Controller.ts`) o en el
`.container.tsx`; el `.view.tsx` recibe `values` / `errors` / `onChange` /
`onSubmit` por props y **no** importa `useAppForm`. Los 5 componentes que la
spec 033 parte en su Fase C (`SmtpConfigModal`, `SeedingProgressModal`,
`MFASetupModal`, `ImportModal`, `ShiftHistoryModal`) exigen su PR de 033
mergeado antes.

- [ ] T8: Migrar `theoretical-shifts`: `src/hooks/useShiftPatternForm.ts`
      (450 líneas), `src/hooks/useShiftAssignmentForm.ts` (233),
      `features/theoretical-shifts/hooks/useLeaveManagerController.ts` (279)
      y `features/theoretical-shifts/components/HolidayForm.tsx` (130) a
      `useAppForm` + schema. Es el PR que descubre los problemas del patrón
      antes de aplicarlo a los demás (AC1, AC2, AC3).
- [ ] T9: Migrar `employee-management`, `meters` y `user-management`:
      `EmployeeForm.tsx` (321), `MeterForm.tsx` (189), `MetersModal.tsx` (210),
      `SingleMeterInputModal.tsx` (134) y `UserForm.tsx` (170) a `useAppForm` +
      schema. Los 5 se parten en `.container.tsx` + `.view.tsx` + hook de
      dominio, lo que además **decrementa el
      `LARGE_HOOKED_COMPONENT_BUDGET` de la spec 033** (AC1, AC2, AC3).
- [ ] T10: Migrar `configuration`, `logbook` y `supervisor-dashboard`:
      `SmtpConfigModal.tsx` (427), `SeedingOptionsModal.tsx` (275),
      `configuration/hooks/useEmailCenterController.ts` (126),
      `AddSupplierModal.tsx` (273), `AddNoveltyModal.tsx` (144) y
      `RejectionReasonModal.tsx` (112) a `useAppForm` + schema
      (AC1, AC2, AC3).
- [ ] T11: Migrar `auth`, `worker-portal` y `dashboard`: `MFASetupModal.tsx`
      (161), `MFALoginModal.tsx` (114),
      `auth/hooks/useChangePasswordModalController.ts` (97),
      `auth/hooks/useForceChangePasswordModalController.ts` (60),
      `worker-portal/hooks/useCorrectionRequestModalController.ts` (144) y
      `dashboard/hooks/useQuickNotesModalController.ts` (56) a `useAppForm` +
      schema (AC1, AC2, AC3).
- [ ] T12: Migrar `auth/pages/LoginPage.tsx` (241),
      `governance/hooks/useSystemMaintenanceController.ts` (288) y
      `src/hooks/useTimestampEditor.ts` (110, cuyo estado vive hoy en el
      store) a `useAppForm` + schema (AC1, AC2, AC3).
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
      componente. El **sort se resuelve antes de calcular los subtotales**
      (`manualSorting` o sort maintained en el controller), porque
      `ReportTable.tsx:88` y `:102` intercalan las filas `{ type: "subtotal" }`
      y `{ type: "total" }` entre los días **antes** de paginar y ordenarlas
      después las mezclaría (AC5).
- [ ] T16: Reescribir `frontend/src/components/ui/ReportTable.tsx` (549
      líneas) sobre las primitivas nuevas, **reconstruyendo las dos tablas**
      (`renderSummaryTable()` sobre `ReportStat[]` y `renderDailyTable()` sobre
      `(DailyReportItem | ReportSubtotal)[]`), e integrar
      `SortableHeader.tsx` (59) y `PaginationControls.tsx` (98) en
      `DataTableHeader`/`DataTable` sin duplicarlos y **conservando su
      exportación** (su segundo consumidor es
      `features/employee-management/components/EmployeeListCard.tsx:5-6`, y
      `src/tests/components/PaginationControls.test.tsx` los cubre); conservar
      la bifurcación desktop/mobile (`ReportTableMobileSummaryCard` +
      `ReportTableMobileDailyCard` vía `ResponsiveView`) (AC5).
- [ ] T17: **Certificar las primitivas nuevas**: registrar `DataTable.tsx`,
      `DataTableHeader.tsx` y `DataTableRow.tsx` en
      `frontend/design-system-certified.json` **y** en los dos mecanismos de
      paridad de `.agents/rules/design-system-governance.md` §7
      (`frontend/scripts/audit-design-system.cjs`, que lee ese JSON como fuente
      única, y `frontend/src/tests/guardrails/designSystemGuardrails.test.ts`).
      Si `ReportTable.tsx` se renombra o se mueve, actualizar el JSON **en el
      mismo PR** y verificar la paridad con el script auditor (AC5).
- [ ] T18: Evaluar caso por caso la migración a la primitiva de
      `features/time-control/components/TimeRecordRow.tsx` (327),
      `features/governance/components/AuditLogFilterPanel.tsx` (457) y
      `AuditLogsView.tsx` (405), `IntegrityAnomalyTable.tsx`; migrar **solo**
      donde la primitiva encaja y **documentar** las excepciones (AC5, AC7).

## Fase E — Guardrails

- [ ] T19: Crear `frontend/src/tests/guardrails/formTableGuardrails.test.ts`:
      (a) todo fichero de `frontend/src/` (tests excluidos) que cumpla una
      de las dos cláusulas del criterio de inventario del spec (Problema 1:
      **(a)** componente con `useState` + handler de envío (`<form`,
      `onSubmit`, `handleSubmit`, `handleSave`, `handleVerify`,
      `handleAddNote`, `handleManualSend`) + campo de entrada (`<input`,
      `<textarea`, `<select`, `<Input`, `<Textarea`, `<Select`, `<Checkbox`,
      `<Switch`, `<NumericKeypad`, `<TimePicker`, `<DatePicker`);
      **(b)** hook de dominio en `features/*/hooks/` o `src/hooks/` con
      `useState` + handler de envío) → whitelist con **budget decreciente**
      inicializado al conteo real medido (**baseline: 34** = las 32 entradas
      que detecta el criterio + `useTimestampEditor.ts` y
      `useSystemMaintenanceController.ts`, que el detector no ve; los 10 no
      migrados quedan con su motivo anotado, y los 5 módulos que no son
      formularios —`SeedingProgressModal`, `ShiftHistoryModal`,
      `ClosedReportsModal`, `ImportModal`, `ExportLogsModal`— no entran);
      (b) componentes que declaran `sortConfig`/`requestSort` → deben usar la
      primitiva de tabla o estar en la whitelist; (c) toda tabla ordenable
      expone `aria-sort`; (d) los `.view.tsx` no instancian `useAppForm` ni
      conservan `useState` de valores; registrar el guardrail en
      `frontend/package.json` (`test:guardrails` y `lint:guardrails`) (AC7).
- [ ] T20: Crear `frontend/src/tests/tables/report-table.a11y.test.ts` con
      axe-core sobre la tabla: sin violaciones nuevas, `aria-sort` correcto en
      los 3 estados y navegación por teclado operativa (AC6).
- [ ] T21: Extender `frontend/e2e/a11y.spec.ts` con la tabla de reportes en
      claro y oscuro (AC6).

## Verificación final

- [ ] T22: Actualizar la documentación: `frontend/src/features/README.md`
      (los hooks de formulario viven en `features/<dominio>/hooks/` y usan
      `useAppForm`; el `.view.tsx` recibe los valores por props),
      `.agents/rules/design-system-governance.md` (sección
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
- [ ] T25: Sincronizar con la **spec 033**: actualizar su
      `LARGE_HOOKED_COMPONENT_BUDGET` (39 → 31, los 8 componentes migrados
      que se parten en container + view) y su whitelist en
      `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts` **en el
      mismo commit** que la última migración de la Fase C, para que los dos
      ratchets no diverjan (AC1, AC7).
