# ADR-0025: Frontend Form & Table Primitives — Capa headless de formularios y data grid

- Estado: Propuesto
- Fecha: 2026-10-21
- Autores: zer0x

## Contexto

El design system de `portal-control` (ADR-0020)certificó **65 primitivas** en
`frontend/design-system-certified.json` y construyó un catálogo navegable
(`/design-system`). Entre esas primitivas hay un juego completo de
**controles de formulario** (`Input`, `Select`, `Checkbox`, `Switch`,
`Textarea`, `DatePicker`, `DatePickerDialog`, `TimePickerDialog`,
`NumericKeypad`, `PasswordChangeForm`) y uno de **navegación de datos**
(`ReportTable` 549 líneas, `SortableHeader` 59, `PaginationControls` 98).

Lo que **no** existe es la capa de comportamiento:

1. **18 formularios de negocio reimplementan la máquina de formulario.** Cada
   uno gestiona `values` + `errors` + `handleChange` + `handleSubmit` +
   `isSubmitting` a mano. Los dos hooks más grandes son
   `src/hooks/useShiftPatternForm.ts` (**450 líneas**) y
   `src/hooks/useShiftAssignmentForm.ts` (233). Componentes: `SmtpConfigModal`
   (427), `SeedingProgressModal` (353), `EmployeeForm` (321),
   `ClosedReportsModal` (308), `ImportModal` (283), `ShiftHistoryModal`
   (276), `SeedingOptionsModal` (275), `AddSupplierModal` (273),
   `MetersModal` (210), `MeterForm` (189), `UserForm` (170),
   `ExportLogsModal` (161), `MFASetupModal` (161), `AddNoveltyModal` (144),
   `SingleMeterInputModal` (134), `HolidayForm` (130), `MFALoginModal` (114),
   `RejectionReasonModal` (112).

   Consecuencias verificables:
   - **la validación no es uniforme** (cada formulario decide sus reglas,
     sus mensajes y cuándo mostrar el error);
   - **la a11y de error no está garantizada**: ADR-0020 §5 exige
     `aria-invalid` + `aria-describedby` en todo control con error, pero
     **ningún guardrail lo verifica** en los formularios de negocio;
   - **el anti-doble-submit es parcial**: la invariante 5 de
     `.agents/rules/frontend-performance.md` exige `disabled={isProcessing}`
     **y** un ref sincrónico, y la cobertura depende de cada handler.

2. **Zod está en el stack (v4.6.5) y hay 27 schemas** en
   `src/types/schemas.ts` (492 líneas: `EmployeeSchema`, `UserSchema`,
   `ShiftReportSchema`, `AssignedShiftSchema`, `LeaveRecordSchema`,
   `HolidaySchema`, `CorrectionRequestSchema`, `MeterReadingItemSchema`…),
   pero **solo se usan para validar IndexedDB**
   (`src/utils/idbValidation.ts`, 95 líneas). **Ninguno valida lo que el
   usuario escribe.** El backend ya valida con Zod
   (`backend/src/modules/**/schemas`), así que las reglas de negocio existen
   en los dos lados pero **no están tipadas entre sí**: el frontend envía
   FormData arbitrario y descubre el error del backend tras el round-trip.

3. **`ReportTable` reimplementa un data grid**: ordenamiento
   (`sortConfig` + `requestSort`), paginación client-side (40 por página),
   **cálculo de subtotales por semana y totales** (`ReportSubtotal`),
   formateo (`formatDecimalHoursToHHMM`) y bifurcación desktop/mobile
   (`ReportTableMobileSummaryCard` + `ReportTableMobileDailyCard`). Es un
   archivo **certificado**, es decir, parte del contrato del design system.
   Problemas: **no expone `aria-sort`** (el ordenamiento no es accesible),
   el cálculo de subtotales está **atrapado dentro del componente** (no es
   testeable sin renderizar 549 líneas) y **no hay virtualización**.

4. **El mismo patrón de tabla está duplicado** en `TimeRecordRow` (327),
   `AuditLogFilterPanel` (457), `AuditLogsView` (405) e
   `IntegrityAnomalyTable`, cada uno con su propio filtrado, orden y render.

## Decisión

1. **Capa de formulario sobre TanStack Form.** Un hook `useAppForm`
   (`frontend/src/hooks/useAppForm.ts`) que envuelve TanStack Form con el
   **resolver de Zod** y las convenciones del producto: `mode: "onSubmit"`
   con revalidación `onChange` tras el primer submit, normalización de
   `values` (`trim`, `undefined` → `null`) antes del submit, foco al primer
   campo inválido, y un helper `withSubmitGuard(ref)` que implementa el
   **ref sincrónico** anti-doble-submit que la invariante 5 ya exige.

2. **Schemas de entrada de usuario derivados del contrato**, en
   `frontend/src/schemas/forms/`, que **reutilizan** los tipos generados en
   `src/types/api-schema.ts` (`components["schemas"]`) en lugar de duplicar
   el contrato, y cuyas reglas **coinciden con las del backend** (el backend
   es la autoridad; si divergen, se corrige el frontend). Un test de paridad
   (`form-backend-parity.test.ts`) compara ambos lados en los casos límite.

3. **Capa de data grid sobre TanStack Table**, con primitivas
   `DataTable` / `DataTableHeader` / `DataTableRow` **headless** que aportan
   el comportamiento y la accesibilidad (`role="grid"`, `aria-rowcount`,
   `aria-colcount`, cabeceras ordenables como `<button>` con `aria-sort`,
   navegación por teclado) **y conservan el diseño actual** (tokens `token-*`,
   tipografía `typo-ui-*`, densidad industrial). El cálculo de subtotales se
   extrae a una **función pura** testeable de forma unitaria.

4. **ADR-0020 se mantiene sin deroga.** TanStack Form y TanStack Table son
   **headless**: no imponen estética ni sustituyen a las primitivas del
   proyecto. Storybook y las librerías de UI con estilo (Radix, shadcn, MUI)
   siguen **descartadas**. El catálogo de Storybook (spec 038) es
   documentación, no runtime.

5. **Guardrails con budget decreciente**, en el patrón ya establecido por
   `stateBoundaryGuardrails` y `design-system-budget.json`: componentes con
   `useState` de formulario → whitelist con budget inicializado al conteo
   real (18); componentes con `sortConfig`/`requestSort` → deben usar la
   primitiva o estar en la whitelist; toda tabla ordenable → `aria-sort`.

## Alternativas consideradas

1. **Radix UI / shadcn / MUI para formularios y tablas** — descartada por
   ADR-0020: el producto es dueño de su estética y sus primitivas ya están
   certificadas. Adoptar un framework de estilo para resolver un problema de
   _comportamiento_ mezcla dos responsabilidades.
2. **React Hook Form en vez de TanStack Form** — descartada: TanStack Form
   comparte el ecosistema de TanStack Query (mismos autores, misma
   filosofía headless-first), lo que reduce la superficie conceptual del
   repo. React Hook Form es un sustituto razonable si el equipo lo prefiere
   — la decisión es reversible porque el hook `useAppForm` es la única
   superficie expuesta.
3. **Escribir la capa de formulario a mano (un `useForm` propio)** —
   descartada: es exactamente el problema actual (18 reimplementaciones),
   distributed a un lugar nuevo. La lógica de un formulario — modo,
   revalidación, foco en error, touched/dirty, normalización — es de las
   áreas donde reinventar produce bugs silenciosos.
4. **No adoptar TanStack Table y mejorar `ReportTable` a mano** —
   descartada: el cálculo de subtotales sí se extrae (esa parte es del
   proyecto), pero el ordenamiento, la paginación y la accesibilidad de tabla
   son problemas resueltos y probados; el coste de reimplementarlos es mayor
   que el de adoptarlos.
5. **Validar solo en el backend** (el frontend no valida) — descartada: el
   backend es la autoridad, pero el round-trip para un RUT mal escrito es
   una demora innecesaria y una peor experiencia. La validación en cliente es
   una **copia** verificada por el test de paridad, no una segunda fuente de
   verdad.
6. **Un único mega-componente de formulario genérico** — descartada: los 18
   formularios tienen semánticas muy distintas (importación de empleados,
   configuración SMTP, MFA, reportes de turno). Una abstracción que los
   cubra a todos sería más difícil de entender que los 18 casos.

## Consecuencias

Positivas:

- **Una sola semántica de formulario** en el producto: mismos mensajes,
  mismo comportamiento de error, mismo anti-doble-submit, misma a11y.
- **La a11y de error pasa de "regla escrita" a "garantizada"**: hay un
  guardrail que lo verifica.
- **El payload al backend deja de ser arbitrario**: los schemas de cliente
  y de servidor se comparan en CI, y una divergencia rompe el build.
- El cálculo de subtotales, hoy atrapado en un componente de 549 líneas,
  pasa a ser **una función pura testeable**.
- La tabla deja de ser un island: expone `aria-sort`, `role="grid"` y
  navegación por teclado.
- Los hooks de formulario más grandes (**450 y 233 líneas**) se reducen a
  la definición del formulario y a las reglas de negocio.

Negativas / costos aceptados:

- **Dos dependencias runtime nuevas** (TanStack Form ~5 kB, TanStack Table
  ~12 kB). El budget de bundle de la spec 037 los vigila.
- **Migrar 18 formularios es un trabajo mecánico pero extenso** (5 PR), y
  durante la migración conviven dos estilos. El guardrail con budget
  decreciente hace visible el avance.
- Los schemas de formulario **duplican reglas que ya existen en el
  backend**. Se mitiga con el test de paridad y con la regla explícita "el
  backend manda", pero es una duplicación real, aceptada a cambio de
  Validation en cliente.
- El test de paridad requiere **ejecutar la lógica de validación del
  backend** desde el test de frontend (importar el módulo del backend o
  reimplementar la regla): es la parte más delicada de la spec.
- Unificar los 5 pares desktop/mobile de tablas **cambia el diseño móvil** de
  esas pantallas; hay que revisarlo visualmente, no solo con tests.

## Referencias

- `frontend/src/hooks/useShiftPatternForm.ts` (450 líneas) y
  `frontend/src/hooks/useShiftAssignmentForm.ts` (233) — los hooks de
  formulario más grandes.
- `frontend/src/components/ui/ReportTable.tsx` (549),
  `SortableHeader.tsx` (59), `PaginationControls.tsx` (98) — el data grid
  hand-rolled y sus piezas.
- `frontend/src/types/schemas.ts` (492 líneas, 27 schemas) y
  `frontend/src/utils/idbValidation.ts` (95) — el uso actual de Zod, limitado
  a IndexedDB.
- `frontend/src/components/ui/{Input,Select,Textarea,Checkbox,Switch}.tsx` —
  las primitivas que se **integran**, no se reemplazan.
- `.agents/rules/design-system-governance.md` §5 — la regla de a11y de error
  que esta spec hace verificable.
- `.agents/rules/frontend-performance.md` invariante 5 — el anti-doble-submit
  que la capa provee.
- `frontend/design-system-certified.json` — las 65 primitivas certificadas
  (paridad de archivos en el mismo PR).
- [spec 036](file:///specs/036-frontend-form-table-primitives/spec.md) —
  implementación, AC y plan.
- [ADR-0020](0020-design-system-governance.md) — la decisión de propiedad del
  diseño que esta spec **no deroga**.
- [ADR-0022](0022-ui-ux-consolidation.md) — la gobernanza del design system
  que esta spec extiende en la capa de formularios y tablas.
