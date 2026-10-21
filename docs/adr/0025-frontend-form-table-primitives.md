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

1. **24 formularios de negocio reimplementan la máquina de formulario.** Cada
   uno gestiona `values` + `errors` + `handleChange` + `handleSubmit` +
   `isSubmitting` a mano, en `useState` local, en el `useState` de un
   controller hook o en el store global. Los dos hooks más grandes son
   `src/hooks/useShiftPatternForm.ts` (**450 líneas**) y
   `src/hooks/useShiftAssignmentForm.ts` (233). Componentes:
   `SmtpConfigModal` (427), `EmployeeForm` (321), `SeedingOptionsModal` (275),
   `AddSupplierModal` (273), `MetersModal` (210), `MeterForm` (189),
   `UserForm` (170), `MFASetupModal` (161), `AddNoveltyModal` (144),
   `SingleMeterInputModal` (134), `HolidayForm` (130), `MFALoginModal` (114),
   `RejectionReasonModal` (112), `LoginPage` (241). Controllers:
   `useLeaveManagerController` (279), `useSystemMaintenanceController` (288),
   `useEmailCenterController` (126), `useCorrectionRequestModalController`
   (144), `useChangePasswordModalController` (97),
   `useForceChangePasswordModalController` (60),
   `useQuickNotesModalController` (56). Store: `useTimestampEditor` (110).

   El **criterio de inventario** es mecánico y es el mismo que ejecuta el
   guardrail: un fichero de `frontend/src/` (tests excluidos) cuenta como
   formulario de negocio si cumple una de dos cláusulas — **(a) componente**
   con `useState` + handler de envío (`<form`, `onSubmit`, `handleSubmit`,
   `handleSave`, `handleVerify`, `handleAddNote`, `handleManualSend`) + campo
   de entrada (**17 ficheros**), o **(b) hook de dominio** en
   `features/*/hooks/` o `src/hooks/` con `useState` + handler de envío
   (**15 ficheros**). El detector cubre **32**; la whitelist parte de **34**
   al añadir los 2 que el detector no puede ver (`useTimestampEditor.ts`, con
   el estado en el store, y `useSystemMaintenanceController.ts`, cuyo handler
   se llama `handleResetPassword`). De esos 34, **24** son formularios de
   mutación y se migran, **2** se evalúan (`GlobalVariablesManager` 865,
   `MeterConfigPanel` 317) y **8** no son formularios (hooks de datos y
   orquestadores).

   **Y 5 módulos que un inventario ingenuo contaría como formularios y no lo
   son**: `SeedingProgressModal` (353, monitor de progreso con polling),
   `ClosedReportsModal` (308, tabla con scroll infinito y filtros locales),
   `ImportModal` (283, wizard de carga de archivo),
   `ShiftHistoryModal` (276, línea de tiempo de solo lectura) y
   `ExportLogsModal` (161, filtro + descarga por URL). Ninguno mantiene
   estado de formulario.

   Consecuencias verificables:
   - **la validación no es uniforme** (cada formulario decide sus reglas,
     sus mensajes y cuándo mostrar el error);
   - **la a11y de error no está garantizada**: ADR-0020 §5 exige
     `aria-invalid` + `aria-describedby` en todo control con error, pero
     **ningún guardrail lo verifica** en los formularios de negocio. El
     defecto concreto está en `components/ui/Input.tsx:25` y
     `components/ui/Textarea.tsx:24`, que dependen de que el consumidor pase
     `id`, mientras que `Select.tsx:17` y `Checkbox.tsx:10` ya usan `useId()`
     como fallback; `Switch.tsx` no tiene ni `label` ni `error`;
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
   (`backend/src/models/schemas/*.schemas.ts`, re-exportados por
   `backend/src/models/schemas.ts`), así que las reglas de negocio existen en
   los dos lados pero **no están tipadas entre sí**: el frontend envía
   FormData arbitrario y descubre el error del backend tras el round-trip.

   Dos hechos condicionan cómo se puede verificar la paridad: el backend
   valida el RUT como `z.string().min(8)`
   (`backend/src/models/schemas/employee.schemas.ts:6`), **sin dígito
   verificador**, mientras que el frontend sí lo comprueba
   (`employee-management/components/EmployeeForm.tsx:78-97`); y hay **19
   reglas `.refine()`** en los schemas del backend que **no son expresables en
   OpenAPI** y por tanto no viajan en `backend/docs/swagger.json`.

3. **`ReportTable` reimplementa un data grid**: ordenamiento
   (`sortConfig` + `requestSort`), paginación client-side (40 por página),
   **cálculo de subtotales por semana y totales** (`ReportSubtotal`),
   formateo (`formatDecimalHoursToHHMM`) y bifurcación desktop/mobile
   (`ReportTableMobileSummaryCard` + `ReportTableMobileDailyCard`). Es un
   archivo **certificado**, es decir, parte del contrato del design system.
   Problemas: **no expone `aria-sort`** (el ordenamiento no es accesible),
   el cálculo de subtotales está **atrapado dentro del componente** (no es
   testeable sin renderizar 549 líneas) y **no hay virtualización**.

   Su estructura impone restricciones a cualquier capa de tabla que lo
   reemplace: renderiza **dos tablas** distintas según `isSingleEmployeeReport`
   (`renderSummaryTable()` sobre `ReportStat[]` y `renderDailyTable()` sobre
   `(DailyReportItem | ReportSubtotal)[]`); **no ordena internamente** (los
   datos llegan ordenados desde `useReportsTabController.ts:104-130`); e
   **intercala las filas de subtotal y total antes de paginar**
   (`ReportTable.tsx:88` y `:102`), de modo que ordenar después mezclaría
   subtotales y días. Además, `SortableHeader` y `PaginationControls` tienen
   un **segundo consumidor**
   (`features/employee-management/components/EmployeeListCard.tsx:5-6`) y las
   primitivas nuevas que lo sustituyan deben **certificarse** en
   `frontend/design-system-certified.json` y en los dos mecanismos de paridad
   de `.agents/rules/design-system-governance.md` §7.

4. **El mismo patrón de tabla está duplicado** en `TimeRecordRow` (327),
   `AuditLogFilterPanel` (457), `AuditLogsView` (405) e
   `IntegrityAnomalyTable`, cada uno con su propio filtrado, orden y render.

## Decisión

1. **Capa de formulario sobre TanStack Form.** Un hook `useAppForm`
   (`frontend/src/hooks/useAppForm.ts`) que envuelve TanStack Form con la
   **validación Zod v4 nativa** y las convenciones del producto: `mode`
   `"onSubmit"` con revalidación `onChange` tras el primer submit,
   normalización de `values` (`trim`, `undefined` → `null`) antes del submit,
   foco al primer campo inválido, y un helper `withSubmitGuard(ref)` que
   implementa el **ref sincrónico** anti-doble-submit que la invariante 5 ya
   exige. El schema se pasa **directamente** en
   `validators: { onSubmit, onChange }`: `@tanstack/react-form` v1 implementa
   la especificación **Standard Schema** y `zod ^4.6.5` es Standard Schema
   nativo, de modo que **no** hace falta ningún adaptador
   (`@tanstack/form-resolvers` no existe como paquete; el adaptador oficial
   de versiones anteriores era `@tanstack/zod-form-adapter`).

   El `useAppForm` **se instancia en el hook de dominio o controller**
   (`features/<dominio>/hooks/use*Controller.ts`) o en el `.container.tsx`, y
   el `.view.tsx` recibe `values` / `errors` / `onChange` / `onSubmit` por
   props. Esto es **la frontera de capas de la spec 033**, no una decisión
   nueva: ningún `.view.tsx` instancia el hook.

2. **Schemas de entrada de usuario derivados del contrato**, en
   `frontend/src/schemas/forms/`, que **reutilizan** los tipos generados en
   `src/types/api-schema.ts` (`components["schemas"]`) en lugar de duplicar
   el contrato, y cuyas reglas **coinciden con las del backend**
   (`backend/src/models/schemas/*.schemas.ts`); el backend es la autoridad y
   si divergen se corrige el frontend. Un test de paridad
   (`form-schema-parity.test.ts`) compara ambos lados en los casos límite
   **sin importar el backend**: contra el artefacto de contrato compartido
   `backend/docs/swagger.json` (`required`, `minLength`, `maxLength`,
   `pattern`, `enum`, `minimum`/`maximum`) y contra **fixtures doradas
   versionadas** para las 19 reglas `.refine()` que no son expresables en
   OpenAPI. La validación de **dígito verificador de RUT**, que solo aplica el
   frontend, se documenta como divergencia deliberada y no como caso de
   paridad.

3. **Capa de data grid sobre TanStack Table**, con primitivas
   `DataTable` / `DataTableHeader` / `DataTableRow` **headless** que aportan
   el comportamiento y la accesibilidad (`role="grid"`, `aria-rowcount`,
   `aria-colcount`, cabeceras ordenables como `<button>` con `aria-sort`,
   navegación por teclado) **y conservan el diseño actual** (tokens `token-*`,
   tipografía `typo-ui-*`, densidad industrial). El cálculo de subtotales se
   extrae a una **función pura** testeable de forma unitaria, y el
   **ordenamiento se resuelve antes** de calcular los subtotales (el
   componente actual intercala las filas de total antes de paginar). Las
   primitivas nuevas se **certifican** en
   `frontend/design-system-certified.json` y en los dos mecanismos de paridad
   de §7 de `design-system-governance.md`, y `SortableHeader` /
   `PaginationControls` **conservan su exportación** porque tienen un segundo
   consumidor (`EmployeeListCard.tsx`).

4. **ADR-0020 se mantiene sin deroga.** TanStack Form y TanStack Table son
   **headless**: no imponen estética ni sustituyen a las primitivas del
   proyecto. Storybook y las librerías de UI con estilo (Radix, shadcn, MUI)
   siguen **descartadas**. El catálogo de Storybook (spec 038) es
   documentación, no runtime.

5. **Guardrails con budget decreciente**, en el patrón ya establecido por
   `stateBoundaryGuardrails` y `design-system-budget.json`: ficheros con
   estado de formulario (criterio mecánico del Contexto 1) → whitelist con
   budget inicializado al conteo real (**34**), con el motivo anotado en cada
   entrada no migrada; componentes con `sortConfig`/`requestSort` → deben
   usar la primitiva o estar en la whitelist; toda tabla ordenable →
   `aria-sort`.

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
   descartada: es exactamente el problema actual (24 reimplementaciones),
   solo que deslocado a un lugar nuevo. La lógica de un formulario — modo,
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
6. **Un único mega-componente de formulario genérico** — descartada: los 24
   formularios tienen semánticas muy distintas (alta de empleados,
   configuración SMTP, MFA, reportes de turno, solicitudes de corrección). Una
   abstracción que los cubra a todos sería más difícil de entender que los 24
   casos.
7. **Importar los schemas del backend en el test de frontend** —
   descartada: rompería `tsc --noEmit` del frontend
   (`frontend/tsconfig.json` incluye solo `src`) y el aislamiento de
   paquetes de CI. `backend/src/models/schemas/common.ts:2-4` ejecuta
   `extendZodWithOpenApi(z)` de `@asteasolutions/zod-to-openapi`, que solo
   está instalado en `backend/`. La alternativa elegida es comparar contra
   el **artefacto de contrato compartido** `backend/docs/swagger.json` —el
   mismo mecanismo que usa la spec 035 en su AC3— más fixtures doradas para
   las reglas que OpenAPI no puede expresar.

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
  ~12 kB). El budget de bundle de la spec 037 los vigila. No se añade ninguna
  dependencia de validación: Standard Schema cubre la integración con Zod.
- **Migrar 24 formularios es un trabajo mecánico pero extenso** (5 PR), y
  durante la migración conviven dos estilos. El guardrail con budget
  decreciente hace visible el avance.
- Los schemas de formulario **duplican reglas que ya existen en el
  backend**. Se mitiga con el test de paridad y con la regla explícita "el
  backend manda", pero es una duplicación real, aceptada a cambio de
  validación en cliente.
- **El artefacto de contrato no cubre todas las reglas**: las **19 reglas
  `.refine()`** del backend no son expresables en OpenAPI y requieren
  fixtures doradas mantenidas a mano. Si el backend cambia una de esas
  reglas sin actualizar las fixtures, el test **no** lo detecta: es una
  dependencia del proceso de revisión, no una garantía automática.
- **La validación de RUT queda asimétrica**: el frontend valida el dígito
  verificador y el backend no. Se mantiene de forma deliberada (el backend
  es la autoridad para todo lo demás), pero es una divergencia conocida que
  habría que revisar si el backend la incorpora.
- **La migración depende de la spec 033**: los componentes que 033 parte en
  container + view + hook de dominio se migran sobre esa arquitectura, y las
  8 piezas migradas que hoy son >150 líneas con hooks y sin gemelo
  container **decrementan el `LARGE_HOOKED_COMPONENT_BUDGET` de 033** (39 →
  31), lo que exige sincronizar los dos ratchets en el mismo commit.
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
- `backend/src/models/schemas/*.schemas.ts` y `backend/src/models/schemas.ts`
  — los schemas Zod de negocio del backend (re-exportados); son la
  **fuente de reglas** de esta spec.
- `backend/docs/swagger.json` — el artefacto de contrato compartido que
  consume el test de paridad, junto con las fixtures doradas para las reglas
  `.refine()`.
- `frontend/src/components/ui/{Input,Select,Textarea,Checkbox,Switch}.tsx` —
  las primitivas que se **integran**, no se reemplazan.
- `.agents/rules/design-system-governance.md` §5 — la regla de a11y de error
  que esta spec hace verificable; §7 — la certificación de las primitivas
  nuevas.
- `.agents/rules/frontend-performance.md` invariante 5 — el anti-doble-submit
  que la capa provee.
- `frontend/design-system-certified.json` — las 65 primitivas certificadas
  (paridad de archivos en el mismo PR).
- [spec 036](file:///specs/036-frontend-form-table-primitives/spec.md) —
  implementación, AC y plan.
- [spec 033](file:///specs/033-frontend-layering-hardening/spec.md) — la
  frontera de capas (container + view + hook de dominio) que esta spec
  respeta y de la que depende.
- [ADR-0020](0020-design-system-governance.md) — la decisión de propiedad del
  diseño que esta spec **no deroga**.
- [ADR-0022](0022-ui-ux-consolidation.md) — la gobernanza del design system
  que esta spec extiende en la capa de formularios y tablas.
