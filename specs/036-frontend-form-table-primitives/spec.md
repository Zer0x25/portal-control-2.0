# Spec 036: Frontend Form & Table Primitives

- Estado: Borrador
- Autor: zer0x
- Fecha: 2026-10-21
- ADR relacionado: [0025-frontend-form-table-primitives.md](file:///docs/adr/0025-frontend-form-table-primitives.md)
- Specs hermanos: [033-frontend-layering-hardening](file:///specs/033-frontend-layering-hardening/spec.md) (frontera de capas), [035-frontend-testing-stack](file:///specs/035-frontend-testing-stack/spec.md) (stack de pruebas), [037-frontend-rendering-observability](file:///specs/037-frontend-rendering-observability/spec.md) (rendimiento)

## Problema

El design system de formularios y de tablas está **hermosamente inventoryado
pero no implementado**. Las primitivas visuales existen
(`Input`, `Select`, `Checkbox`, `Switch`, `Textarea`, `DatePicker`,
`DatePickerDialog`, `TimePickerDialog`, `NumericKeypad`,
`PasswordChangeForm`), pero **no hay una capa de estado, validación ni
comportamiento de formulario**, y **no hay una capa de data grid**. Cada
pantalla reimplementa las dos desde cero.

1. **18 formularios con estado propio, reimplementando la misma máquina.**
   Cada uno gestiona `values` + `errors` + `handleChange` + `handleSubmit` +
   `isSubmitting` a mano:

   | Componente                                  | Líneas | Componente                                      | Líneas |
   | ------------------------------------------- | -----: | ----------------------------------------------- | -----: |
   | `configuration/SmtpConfigModal.tsx`         |    427 | `meters/MeterForm.tsx`                          |    189 |
   | `configuration/SeedingProgressModal.tsx`    |    353 | `user-management/UserForm.tsx`                  |    170 |
   | `employee-management/EmployeeForm.tsx`      |    321 | `governance/ExportLogsModal.tsx`                |    161 |
   | `logbook/ClosedReportsModal.tsx`            |    308 | `auth/MFASetupModal.tsx`                        |    161 |
   | `employee-management/ImportModal.tsx`       |    283 | `logbook/AddNoveltyModal.tsx`                   |    144 |
   | `employee-management/ShiftHistoryModal.tsx` |    276 | `meters/SingleMeterInputModal.tsx`              |    134 |
   | `configuration/SeedingOptionsModal.tsx`     |    275 | `theoretical-shifts/HolidayForm.tsx`            |    130 |
   | `logbook/AddSupplierModal.tsx`              |    273 | `auth/MFALoginModal.tsx`                        |    114 |
   | `meters/MetersModal.tsx`                    |    210 | `supervisor-dashboard/RejectionReasonModal.tsx` |    112 |

   El mayor de todos está fuera de un componente:
   `src/hooks/useShiftPatternForm.ts` tiene **450 líneas** de máquina de
   formulario hecha a mano, y `src/hooks/useShiftAssignmentForm.ts` **233**.

   Consecuencias medibles:
   - **La validación no es uniforme**: cada formulario decide sus propias
     reglas, sus mensajes de error y cuándo mostrar el error (onBlur vs
     onSubmit vs onChange). No hay un contrato común.
   - **La accesibilidad de error es inconsistente**: la regla de
     `.agents/rules/design-system-governance.md` §5 exige `aria-invalid` +
     `aria-describedby` en cada `Input` con error, pero **no hay ninguna
     herramienta que lo verifique**: el guardrail de a11y no cubre los
     formularios de negocio.
   - **El anti-doble-submit está parcialmente implementado**: la invariante 5
     de `.agents/rules/frontend-performance.md` exige
     `disabled={isProcessing}` **y** un ref sincrónico (`isSubmittingRef`),
     pero solo algunos handlers lo tienen. Con 18 formularios, la cobertura
     es por remembered individual.

2. **Zod ya está en el stack (v4.6.5) y ya hay 27 schemas** en
   `src/types/schemas.ts` (492 líneas: `EmployeeSchema`, `UserSchema`,
   `ShiftReportSchema`, `AssignedShiftSchema`, `LeaveRecordSchema`,
   `HolidaySchema`, `CorrectionRequestSchema`, `MeterReadingItemSchema`, …) —
   pero **esos schemas solo se usan para validar IndexedDB**
   (`src/utils/idbValidation.ts`, 95 líneas). **Ninguno se usa para validar
   lo que el usuario escribe**. El backend ya valida con Zod
   (`backend/src/**`), así que las reglas de negocio existen en los dos lados
   pero **no están tipadas entre sí**: el frontend envía FormData arbitrario
   y descubre el error del backend después del round-trip.

3. **`ReportTable.tsx` (549 líneas) es un data grid hand-rolled**, y está
   **certificado** en `frontend/design-system-certified.json` (65 archivos),
   es decir, es parte del contrato del design system. Reimplementa:
   ordenamiento por columna (`sortConfig` + `requestSort`), paginación
   client-side (40 filas por página), **cálculo de subtotales por semana y
   totales** (`ReportSubtotal`), totales formateados
   (`formatDecimalHoursToHHMM`), y una bifurcación **desktop / mobile**
   (`ReportTableMobileSummaryCard` + `ReportTableMobileDailyCard` vía
   `ResponsiveView`). `SortableHeader` (59) y `PaginationControls` (98)
   completan el conjunto.

   Consecuencias:
   - **El ordenamiento no es accesible**: `SortableHeader` no expone
     `aria-sort` ni es un `<button>` con `aria-label` (no hay test de axe
     sobre la tabla).
   - **La lógica de subtotales está acoplada a la vista**: no es testeable de
     forma unitaria sin renderizar el componente completo, y por eso
     `ReportTable` tiene una cobertura baja pese a ser certificado.
   - **No hay virtualización en la tabla**: con 40 filas por página funciona,
     pero el patrón de paginación+subtotales está reimplementado en otros
     sitios (ver §4).

4. **El mismo patrón de tabla está duplicado en varias features.** El
   `TimeRecordRow` (`features/time-control/components/TimeRecordRow.tsx`,
   327 líneas), `AuditLogFilterPanel` (457), `AuditLogsView` (405) y
   `IntegrityAnomalyTable` implementan cada uno su filtrado, orden y render de
   filas con el mismo patrón pero **sin una primitiva común** — el mismo
   problema que la spec 001 resolvió para los modales y la spec 031 para los
   spinners, aplicado a las tablas.

5. **Sin primitive headless**: la decisión de ADR-0020 (descartar
   Radix/shadcn/MUI) se tomó **antes** de que existiera el hueco de
   formularios y tablas. La decisión sigue siendo correcta para el
   _diseño_ (el producto es dueño de su estética), pero hoy significa
   **reimplementar sin abstracto** la máquina de estado de formulario, la
   validación y el data grid.

## Alcance

Dentro:

- **A. Capa de formulario sobre TanStack Form**: un hook
  (`useAppForm`) que envuelve TanStack Form con el **resolver de Zod** y
  convenciones del proyecto (mensajes de error en español, `mode` por
  defecto, normalización de `values` antes del submit, foco al primer error).
- **B. Schemas de formulario derivados del contrato**: schemas Zod de
  **entrada de usuario** (distintos de los de IndexedDB) para los formularios
  de negocio, con reglas que coinciden con las del backend
  (`backend/src/modules/**/schemas`), reutilizando los tipos ya generados en
  `src/types/api-schema.ts` para no duplicar el contrato.
- **C. Migración de los formularios**: los 18 formularios + los 2 hooks de
  formulario más grandes migran a la capa `useAppForm`, con su validación
  (client-side) alineada con el backend.
- **D. Capa de data grid sobre TanStack Table**: un hook
  (`useReportTable`) + primitivas (`DataTable`, `DataTableHeader`,
  `DataTableRow`) sobre TanStack Table, que replacing la lógica de
  `ReportTable` (549 líneas) y **`SortableHeader` + `PaginationControls`**
  (157 líneas), con `aria-sort` en las cabeceras ordenables y
  `role="grid"`/`aria-rowcount` en la tabla.
- **E. Guardrails**: invariante de que **todo** formulario de negocio valida
  con Zod (ningún `useState` de `values` suelto), e invariante de que las
  tablas ordenables exponen `aria-sort` y son navegables por teclado.

Fuera (explícito):

- **El diseño visual de los formularios y tablas**: se conserva. El
  `Input`, `Select`, `Checkbox`, `Switch`, `Textarea`, `DatePickerDialog`,
  `TimePickerDialog` y `NumericKeypad` actuales **no se reemplazan**: la
  capa nueva se integra **con** ellos, no los sustituye. ADR-0020 se mantiene
  sin cambios.
- **Radix / shadcn / MUI**: descartado (ADR-0020). TanStack Form y TanStack
  Table son **headless**: no imponen estética.
- **Cambios en el backend**: no se toca `backend/`. Los schemas de formulario
  se **derivan** de las reglas del backend, no las sustituyen. Si una regla
  diverge, el backend manda.
- **Migración de `api-schema.ts`**: el SDK generado por `openapi-typescript`
  no se modifica; los schemas de formulario se apoyan en sus tipos.
- **`swagger.json`**: no cambia.
- Specs hermanas: la caché y el cliente HTTP son de la
  [spec 034](file:///specs/034-frontend-http-client-consolidation/spec.md); el
  mocking para poder testear los formularios es de la
  [spec 035](file:///specs/035-frontend-testing-stack/spec.md); el
  rendimiento de render de las tablas virtualizadas es de la
  [spec 037](file:///specs/037-frontend-rendering-observability/spec.md).

## Criterios de aceptación

- [ ] AC1: **Una capa de formulario única**. Existe `useAppForm` (wrapper de
      TanStack Form + resolver de Zod) en `frontend/src/hooks/` y **los 18
      formularios de negocio** de la tabla del Problema 1 + los 2 hooks
      `useShiftPatternForm` (450 líneas) y `useShiftAssignmentForm` (233)
      lo usan. **Ningún** formulario de negocio mantiene `values`/`errors` en
      `useState` sueltos.
- [ ] AC2: **Validación de formulario alineada con el backend**. Existe un
      schema Zod de **entrada de usuario** por formulario de negocio, con
      reglas que coinciden con las del backend; los mensajes de error están
      en español y son consistentes. Un **test de contrato** verifica que
      cada schema de formulario acepta exactamente los payloads que el
      backend acepta (caso límite incluido: RUT chileno, longitud de
      contraseña, rangos de hora, formatos de fecha del negocio).
- [ ] AC3: **A11y de error garantizada**. Todo `Input`/`Select`/`Textarea`
      con error expone `aria-invalid="true"` y `aria-describedby` apuntando al
      mensaje, y el mensaje está asociado al `label` vía `htmlFor`; el primer
      campo inválido recibe foco al enviar. **Guardrail**: un test verifica
      esta invariante en todos los formularios migrados.
- [ ] AC4: **Anti-doble-submit uniforme**. Todo formulario migrado bloquea
      un segundo envío con **ref sincrónico** (`isSubmittingRef`) **y**
      `disabled` en el botón, complyendo la invariante 5 de
      `.agents/rules/frontend-performance.md`; el botón refleja estado de
      carga.
- [ ] AC5: **Un solo data grid**. `frontend/src/components/ui/ReportTable.tsx`
      (549 líneas) deja de implementar sort/paginación/subtotales a mano y se
      apoya en la primitiva nueva sobre TanStack Table;
      `SortableHeader` (59) y `PaginationControls` (98) se **integran** en la
      primitiva (no se duplican). El **cálculo de subtotales** (por semana y
      totales) pasa a una función pura **testeable de forma unitaria**.
- [ ] AC6: **Tabla accesible**. La tabla expone `role="grid"`,
      `aria-rowcount`, `aria-colcount`; las cabeceras ordenables son
      `<button>` con `aria-sort` (`ascending`/`descending`/`none`) y nombre
      accesible; la navegación por teclado funciona (flechas sobre la fila
      activa). Un test con **axe-core** sobre la tabla no reporta violaciones
      nuevas.
- [ ] AC7: **Guardrails de formularios y tablas**. Nuevo
      `frontend/src/tests/guardrails/formTableGuardrails.test.ts` con: (a)
      todo componente con `useState` de `values`/`errors` de formulario en
      `features/` está en una **whitelist explícita** (budget decreciente,
      inicializado al conteo real); (b) todo componente que declara
      `sortConfig`/`requestSort` usa la primitiva de tabla o está en la
      whitelist; (c) las tablas ordenables exponen `aria-sort`. Se registra
      en `test:guardrails` y `lint:guardrails`.
- [ ] AC8: **Sin regresión funcional**. `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` en verde y `npm run e2e:staging` en verde (56
      tests), incluidos los flujos que dependen de formularios:
      alta/edición de empleados, alta de reportes de turno, configuración
      SMTP, cambio de contraseña y MFA.

## Restricciones

- Constitución (I–V): en particular IV ("calidad con ratchet") — el guardrail
  nuevo es un ratchet con budget inicializado al conteo real medido, y
  **ADR-0020 no se deroga**: esta spec no introduce dependencia de estilo.
- **El diseño visual no cambia**: los componentes de `components/ui/` se
  integran, no se reemplazan. Un form con TanStack Form debe seguir
  renderizando el mismo `Input`/`Select`/`Textarea`.
- **Los mensajes de error son de la UI**: viven en el frontend, en español,
  y son consistentes con el tono del producto (ver `src/utils/mappings.ts`).
- **El backend es la autoridad**: si una regla de validación diverge entre
  frontend y backend, el frontend se corrige, no el backend.
- **Los `data-testid` no se renombran**: los e2e dependen de ellos.
- TanStack Form y TanStack Table son **runtime** (no devDependencies) porque
  se usan en producción.
- Rollback por fase: cada workstream (A–E) es un PR independiente.

## Trazabilidad

- **Tests que lo probarán**:
  - `frontend/src/tests/guardrails/formTableGuardrails.test.ts` (nuevo, AC7)
  - `frontend/src/tests/forms/*.test.ts` (nuevos: validación, foco al primer
    error, anti-doble-submit, AC2, AC3, AC4)
  - `frontend/src/tests/contracts/form-backend-parity.test.ts` (nuevo, AC2)
  - `frontend/src/tests/tables/report-subtotals.test.ts` (nuevo: función pura,
    AC5)
  - `frontend/src/tests/tables/report-table.a11y.test.ts` (nuevo, AC6)
  - `frontend/e2e/a11y.spec.ts` (extendido con la tabla, AC6)
- **Docs a actualizar**:
  - `frontend/src/features/README.md` (los hooks de formulario viven en
    `features/<dominio>/hooks/` y usan `useAppForm`)
  - `.agents/rules/design-system-governance.md` (sección nueva: "Formularios
    y tablas" con el contrato de la capa)
  - `.agents/rules/frontend-performance.md` (invariante 5 ampliada: la
    protección anti-doble-submit la provee la capa de formulario)
  - `docs/adr/0025-frontend-form-table-primitives.md`
  - `docs/adr/README.md` (índice)
