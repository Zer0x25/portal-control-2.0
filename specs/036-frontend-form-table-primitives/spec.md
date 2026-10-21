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

1. **34 módulos de formulario reimplementan la máquina de formulario.**
   Cada uno gestiona `values` + `errors` + `handleChange` + `handleSubmit` +
   `isSubmitting` a mano: en `useState` local, en el `useState` de un
   controller hook o en el store global.

   **Criterio de inventario** (mecánico, y el mismo que ejecuta el guardrail
   de AC7): un fichero bajo `frontend/src/` —excluidos los tests— cuenta como
   formulario de negocio si cumple **una** de estas dos cláusulas:

   - **(a) Componente** — contiene `useState`, un handler de envío (`<form`,
     `onSubmit`, `handleSubmit`, `handleSave`, `handleVerify`,
     `handleAddNote`, `handleManualSend`) **y** un campo de entrada (`<input`,
     `<textarea`, `<select`, `<Input`, `<Textarea`, `<Select`, `<Checkbox`,
     `<Switch`, `<NumericKeypad`, `<TimePicker`, `<DatePicker`):
     **17 ficheros**.
   - **(b) Hook de dominio** — está en `features/*/hooks/` o `src/hooks/` y
     contiene `useState` **y** un handler de envío: **15 ficheros**.

   El detector cubre **32 ficheros**. La whitelist del guardrail (AC7) parte
   de **34**, porque añade **2** que el detector no puede ver:
   `src/hooks/useTimestampEditor.ts` (mantiene el estado **en el store**, no
   en `useState`) y
   `governance/hooks/useSystemMaintenanceController.ts` (su handler se llama
   `handleResetPassword`, fuera de la lista de nombres del detector).

   **24 de ellos son formularios de mutación** (envían un payload al backend)
   y son el alcance de la migración de la Fase C:

   | #   | Módulo                       | Fichero que contiene el estado                               |   L |
   | --- | ---------------------------- | ------------------------------------------------------------ | --: |
   | 1   | Config SMTP                  | `configuration/components/SmtpConfigModal.tsx`               | 427 |
   | 2   | Alta/edición de empleado     | `employee-management/components/EmployeeForm.tsx`            | 321 |
   | 3   | Opciones de siembra          | `configuration/components/SeedingOptionsModal.tsx`           | 275 |
   | 4   | Alta de proveedor            | `logbook/components/AddSupplierModal.tsx`                    | 273 |
   | 5   | Lecturas de medidores        | `meters/components/MetersModal.tsx`                          | 210 |
   | 6   | Medidor                      | `meters/components/MeterForm.tsx`                            | 189 |
   | 7   | Alta/edición de usuario      | `user-management/components/UserForm.tsx`                    | 170 |
   | 8   | Setup MFA                    | `auth/components/MFASetupModal.tsx`                          | 161 |
   | 9   | Novedad                      | `logbook/components/AddNoveltyModal.tsx`                     | 144 |
   | 10  | Lectura de medidor           | `meters/components/SingleMeterInputModal.tsx`                | 134 |
   | 11  | Festivo                      | `theoretical-shifts/components/HolidayForm.tsx`              | 130 |
   | 12  | Login MFA                    | `auth/components/MFALoginModal.tsx`                          | 114 |
   | 13  | Motivo de rechazo            | `supervisor-dashboard/components/RejectionReasonModal.tsx`   | 112 |
   | 14  | Login                        | `auth/pages/LoginPage.tsx`                                   | 241 |
   | 15  | Ausencias                    | `theoretical-shifts/hooks/useLeaveManagerController.ts`      | 279 |
   | 16  | Reset de contraseña (admin)  | `governance/hooks/useSystemMaintenanceController.ts`         | 288 |
   | 17  | Envío manual de correo       | `configuration/hooks/useEmailCenterController.ts`            | 126 |
   | 18  | Solicitud de corrección      | `worker-portal/hooks/useCorrectionRequestModalController.ts` | 144 |
   | 19  | Cambio de contraseña         | `auth/hooks/useChangePasswordModalController.ts`             |  97 |
   | 20  | Cambio forzado de contraseña | `auth/hooks/useForceChangePasswordModalController.ts`        |  60 |
   | 21  | Nota rápida                  | `dashboard/hooks/useQuickNotesModalController.ts`            |  56 |
   | 22  | Patrón de turno              | `src/hooks/useShiftPatternForm.ts`                           | 450 |
   | 23  | Asignación de turno          | `src/hooks/useShiftAssignmentForm.ts`                        | 233 |
   | 24  | Edición de timestamp         | `src/hooks/useTimestampEditor.ts` (estado en el store)       | 110 |

   El mayor de todos está fuera de un componente:
   `src/hooks/useShiftPatternForm.ts` tiene **450 líneas** de máquina de
   formulario hecha a mano, y `src/hooks/useShiftAssignmentForm.ts` **233**.

   **Los 10 restantes con estado manual no se migran en esta spec** y quedan
   anotados en la whitelist del guardrail (AC7) con su motivo:

   | Fichero                                                      |   L | Motivo                                          |
   | ------------------------------------------------------------ | --: | ----------------------------------------------- |
   | `configuration/components/GlobalVariablesManager.tsx`        | 865 | panel de configuración compuesto → **evaluar**  |
   | `meters/components/MeterConfigPanel.tsx`                     | 317 | editor de filas dinámicas → **evaluar**         |
   | `components/ui/TimePickerDialog.tsx`                         | 146 | primitiva certificada, no formulario de negocio |
   | `employee-management/hooks/useEmployeeManagementData.ts`     | 344 | hook de datos, no de formulario                 |
   | `theoretical-shifts/hooks/useAssignmentManagerController.ts` | 242 | orquestador de asignación                       |
   | `user-management/hooks/useUserManagementData.ts`             | 187 | hook de datos, no de formulario                 |
   | `time-control/hooks/useTimeControlModals.ts`                 | 166 | orquestador de modales, no formulario           |
   | `theoretical-shifts/hooks/usePatternManagerController.ts`    | 110 | delegador al hook de patrón                     |
   | `theoretical-shifts/hooks/useHolidayManagerController.ts`    |  98 | delegador al hook de festivos                   |
   | `communications/hooks/useCommunicationsData.ts`              |  55 | hook de datos, no de formulario                 |

   **Y 5 módulos que el inventario anterior contaba como formularios y no lo
   son** — no entran ni en la whitelist, porque no mantienen estado de
   formulario:

   | Fichero                                                |   L | Motivo                                                                                      |
   | ------------------------------------------------------ | --: | ------------------------------------------------------------------------------------------- |
   | `configuration/components/SeedingProgressModal.tsx`    | 353 | monitor de progreso con polling a `healthService`; sin campos ni payload                    |
   | `logbook/components/ClosedReportsModal.tsx`            | 308 | tabla con scroll infinito (`useShiftReportsInfinite`) y 2 filtros locales                   |
   | `employee-management/components/ImportModal.tsx`       | 283 | wizard de 4 pasos sobre archivo Excel; su `errors` es la respuesta del preview del servidor |
   | `employee-management/components/ShiftHistoryModal.tsx` | 276 | línea de tiempo de solo lectura (`/audit-logs?category=SHIFT_ASSIGNMENT`)                   |
   | `governance/components/ExportLogsModal.tsx`            | 161 | filtro de rango + descarga por URL; no envía payload de mutación                            |

   Del mismo modo, `time-control/components/QuickActionModal.tsx` **no** es un
   formulario: su controller (`useQuickActionModalController.ts`) solo gestiona
   `activeTab` e `isArmed`, sin valores ni envío.

   Consecuencias medibles:
   - **La validación no es uniforme**: cada formulario decide sus propias
     reglas, sus mensajes de error y cuándo mostrar el error (onBlur vs
     onSubmit vs onChange). No hay un contrato común.
   - **La accesibilidad de error es inconsistente**: la regla de
     `.agents/rules/design-system-governance.md` §5 exige `aria-invalid` +
     `aria-describedby` en cada `Input` con error, pero **no hay ninguna
     herramienta que lo verifique**: el guardrail de a11y no cubre los
     formularios de negocio. El fallo concreto está en
     `components/ui/Input.tsx:25` y `components/ui/Textarea.tsx:24`:
     `aria-describedby={error && id ? `${id}-error` : undefined}` depende de
     que el consumidor pase `id`; `Select.tsx:17` y `Checkbox.tsx:10` ya
     resuelven eso con `useId()`, pero `Input`, `Textarea` y `Switch` no.
   - **El anti-doble-submit está parcialmente implementado**: la invariante 5
     de `.agents/rules/frontend-performance.md` exige
     `disabled={isProcessing}` **y** un ref sincrónico (`isSubmittingRef`),
     pero solo algunos handlers lo tienen. Con 24 formularios, la cobertura
     es por remembered individual.

2. **Zod ya está en el stack (v4.6.5) y ya hay 27 schemas** en
   `src/types/schemas.ts` (492 líneas: `EmployeeSchema`, `UserSchema`,
   `ShiftReportSchema`, `AssignedShiftSchema`, `LeaveRecordSchema`,
   `HolidaySchema`, `CorrectionRequestSchema`, `MeterReadingItemSchema`, …) —
   pero **esos schemas solo se usan para validar IndexedDB**
   (`src/utils/idbValidation.ts`, 95 líneas). **Ninguno se usa para validar
   lo que el usuario escribe**. El backend ya valida con Zod
   (`backend/src/models/schemas/*.schemas.ts`, re-exportados por
   `backend/src/models/schemas.ts`), así que las reglas de negocio existen en
   los dos lados pero **no están tipadas entre sí**: el frontend envía
   FormData arbitrario y descubre el error del backend después del round-trip.

   La asimetría es real y medible. El backend valida el RUT como
   `z.string().min(8)` (`backend/src/models/schemas/employee.schemas.ts:6`),
   **sin dígito verificador**, mientras que el frontend sí lo comprueba
   (`employee-management/components/EmployeeForm.tsx:78-97`): esa regla es
   **exclusiva del cliente** y no puede declararse como caso de paridad. Y
   hay **19 reglas `.refine()`** en los schemas del backend
   (`report`, `time-correction`, `dataQuery`, `smtpProfile`, `exportFilters`,
   `core`, `meter` y `common`) que **no son expresables en OpenAPI**, por lo
   que no viajan en `backend/docs/swagger.json`.

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

   Su estructura impone tres restricciones que la capa de tabla debe
   respetar:
   - **Renderiza dos tablas distintas** según `isSingleEmployeeReport`:
     `renderSummaryTable()` sobre `ReportStat[]` y `renderDailyTable()` sobre
     `(DailyReportItem | ReportSubtotal)[]`. No es "una tabla con dos modos".
   - **No ordena internamente**: los datos llegan ya ordenados desde
     `useReportsTabController.ts:104-130` (`sortedReportData`), y el
     componente solo recibe `sortConfig` y `requestSort` como props.
   - **Inyecta las filas de subtotal y total antes de paginar**
     (`ReportTable.tsx:88` y `:102`), intercalando filas
     `{ type: "subtotal" }` y `{ type: "total" }` entre los días. Ordenar
     **después** de esa inyección mezclaría subtotales y días.
   - `SortableHeader` y `PaginationControls` tienen **un segundo consumidor**:
     `features/employee-management/components/EmployeeListCard.tsx:5-6` los
     importa, y `src/tests/components/PaginationControls.test.tsx` los cubre.

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
  (`useAppForm`) que envuelve TanStack Form con la **validación Zod v4**
  (Standard Schema nativo, sin adaptadores externos) y las convenciones del
  proyecto (mensajes de error en español, `mode` por defecto, normalización
  de `values` antes del submit, foco al primer error).
- **B. Schemas de formulario derivados del contrato**: schemas Zod de
  **entrada de usuario** (distintos de los de IndexedDB) para los formularios
  de negocio, con reglas que coinciden con las del backend
  (`backend/src/models/schemas/*.schemas.ts`, re-exportados por
  `backend/src/models/schemas.ts`), reutilizando los tipos ya generados en
  `src/types/api-schema.ts` para no duplicar el contrato.
- **C. Migración de los formularios**: los **24 formularios de mutación** del
  Problema 1 migran a la capa `useAppForm`, con su validación (client-side)
  alineada con el backend. La migración **respeta la frontera de capas de la
  [spec 033](file:///specs/033-frontend-layering-hardening/spec.md)**: el
  `useAppForm` se instancia en el **hook de dominio o controller**
  (`features/<dominio>/hooks/use*Controller.ts`) o en el `.container.tsx`, y
  el `.view.tsx` recibe `values` / `errors` / `onChange` / `onSubmit` por
  props. **Nunca** se instancia en un `.view.tsx`.
- **D. Capa de data grid sobre TanStack Table**: un hook
  (`useReportTable`) + primitivas (`DataTable`, `DataTableHeader`,
  `DataTableRow`) sobre TanStack Table, que reemplazan la lógica de
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
- **Importar código de `backend/src/**` desde `frontend/`**: prohibido. La
  paridad se verifica contra el **artefacto de contrato compartido**
  `backend/docs/swagger.json` (JSON, sin imports), nunca importando los
  módulos del backend: `backend/src/models/schemas/common.ts:2-4` ejecuta
  `extendZodWithOpenApi(z)` de `@asteasolutions/zod-to-openapi`, que solo
  está en `backend/package.json`, y `frontend/tsconfig.json` incluye
  únicamente `src`. Un import cruzado rompería `tsc --noEmit` del frontend y
  el aislamiento de paquetes de CI
  (`.agents/rules/ci-performance.md`).
- **Los 5 módulos que no son formularios** (Problema 1): `SeedingProgressModal`,
  `ShiftHistoryModal`, `ClosedReportsModal`, `ImportModal` y
  `ExportLogsModal` quedan fuera de la migración y no entran en la whitelist
  del guardrail.
- **Migración de `api-schema.ts`**: el SDK generado por `openapi-typescript`
  no se modifica; los schemas de formulario se apoyan en sus tipos.
- **`swagger.json`**: no cambia.
- **La frontera de capas de la spec 033**: no se rediseña aquí. Esta spec
  la **respeta** y, cuando toca un componente que 033 ya partió, trabaja
  sobre la arquitectura resultante (container + view + hook de dominio).
- Specs hermanas: la caché y el cliente HTTP son de la
  [spec 034](file:///specs/034-frontend-http-client-consolidation/spec.md); el
  mocking para poder testear los formularios es de la
  [spec 035](file:///specs/035-frontend-testing-stack/spec.md); el
  rendimiento de render de las tablas virtualizadas es de la
  [spec 037](file:///specs/037-frontend-rendering-observability/spec.md).

## Criterios de aceptación

- [ ] AC1: **Una capa de formulario única**. Existe `useAppForm` (wrapper de
      TanStack Form + validación Zod v4 vía Standard Schema) en
      `frontend/src/hooks/` y **los 24 formularios de mutación** de la tabla
      del Problema 1 lo usan (directamente o a través del hook de dominio que
      los envuelve). **Ningún** formulario de negocio mantiene `values`/`errors`
      en `useState` sueltos. El `useAppForm` se instancia **siempre** en el
      hook de dominio / controller o en el `.container.tsx`, nunca en un
      `.view.tsx` (invariante de la spec 033 AC1).
- [ ] AC2: **Validación de formulario alineada con el backend**. Existe un
      schema Zod de **entrada de usuario** por formulario de negocio, con
      reglas que coinciden con las del backend; los mensajes de error están
      en español y son consistentes. Un **test de contrato** verifica que
      cada schema de formulario acepta exactamente los payloads que el
      backend acepta, contra el artefacto compartido
      `backend/docs/swagger.json`: para cada schema se comparan `required`,
      `minLength`, `maxLength`, `pattern`, `enum` y `minimum`/`maximum`. Las
      **19 reglas `.refine()`** del backend no son expresables en OpenAPI y se
      cubren con **fixtures doradas versionadas** (`cases/*.json`) con el
      veredicto esperado, revisadas cuando cambia el schema del backend. La
      validación de **dígito verificador de RUT**, que el frontend sí aplica
      y el backend no (`employee.schemas.ts:6` solo exige `min(8)`), se
      documenta como **divergencia deliberada a favor del cliente**, no como
      caso de paridad.
- [ ] AC3: **A11y de error garantizada**. Todo `Input`/`Select`/`Textarea`
      con error expone `aria-invalid="true"` y `aria-describedby` apuntando al
      mensaje, y el mensaje está asociado al `label` vía `htmlFor`; el primer
      campo inválido recibe foco al enviar. Las primitivas **conservan la prop
      `error?: string`** que ya tienen (`Input.tsx:5`, `Select.tsx:11`,
      `Textarea.tsx:5`, `Checkbox.tsx:5`) — **no** se introduce una segunda
      prop redundante — y `Input`, `Textarea` y `Switch` incorporan un
      **fallback con `useId()`** como ya hacen `Select.tsx:17` y
      `Checkbox.tsx:10`, de modo que `id`, `htmlFor` y `aria-describedby`
      quedan garantizados en el 100 % de los casos; `Switch` además gana
      `label` y `error`. **Guardrail**: un test verifica esta invariante en
      todos los formularios migrados.
- [ ] AC4: **Anti-doble-submit uniforme**. Todo formulario migrado bloquea
      un segundo envío con **ref sincrónico** (`isSubmittingRef`) **y**
      `disabled` en el botón, complyendo la invariante 5 de
      `.agents/rules/frontend-performance.md`; el botón refleja estado de
      carga.
- [ ] AC5: **Un solo data grid**. `frontend/src/components/ui/ReportTable.tsx`
      (549 líneas) deja de implementar sort/paginación/subtotales a mano y se
      apoya en la primitiva nueva sobre TanStack Table. El **ordenamiento se
      resuelve antes de calcular los subtotales** (`manualSorting` o el sort
      en el hook de tabla), porque `ReportTable.tsx:88` y `:102` intercalan
      filas `{ type: "subtotal" }` y `{ type: "total" }` entre los días y
      ordenarlas después las mezclaría. Las **dos tablas** del componente
      (`renderSummaryTable()` y `renderDailyTable()`) se reconstruyen, no solo
      una. `SortableHeader` (59) y `PaginationControls` (98) **se integran**
      en la primitiva (no se duplican) y **conservan su exportación**, porque
      `features/employee-management/components/EmployeeListCard.tsx:5-6` los
      consume. El **cálculo de subtotales** (por semana y totales) pasa a una
      función pura **testeable de forma unitaria**. Las primitivas nuevas
      (`DataTable`, `DataTableHeader`, `DataTableRow`) se registran en
      `frontend/design-system-certified.json` **y** en los dos mecanismos de
      paridad que exige `.agents/rules/design-system-governance.md` §7
      (`frontend/scripts/audit-design-system.cjs` y
      `frontend/src/tests/guardrails/designSystemGuardrails.test.ts`).
- [ ] AC6: **Tabla accesible**. La tabla expone `role="grid"`,
      `aria-rowcount`, `aria-colcount`; las cabeceras ordenables son
      `<button>` con `aria-sort` (`ascending`/`descending`/`none`) y nombre
      accesible; la navegación por teclado funciona (flechas sobre la fila
      activa). Un test con **axe-core** sobre la tabla no reporta violaciones
      nuevas.
- [ ] AC7: **Guardrails de formularios y tablas**. Nuevo
      `frontend/src/tests/guardrails/formTableGuardrails.test.ts` con: (a)
      todo fichero que cumple el criterio de inventario del Problema 1 está en
      una **whitelist explícita** (budget decreciente, inicializado a **34**,
      el conteo real medido); (b) todo componente que declara
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
- **Sin dependencias de validación adicionales**: `@tanstack/react-form` v1
  implementa la especificación **Standard Schema**, y `zod ^4.6.5` (ya en
  `frontend/package.json`) es Standard Schema nativo, de modo que el schema
  se pasa **directamente** en `validators: { onSubmit, onChange }`. **No** se
  añade `@tanstack/form-resolvers`: ese nombre de paquete **no existe** en
  npm (404 en el registry) y el adaptador oficial para versiones anteriores a
  Standard Schema era `@tanstack/zod-form-adapter`, que tampoco es necesario.
- **Aislamiento de paquetes**: `frontend/src/**` no importa `backend/src/**`.
  La verificación de paridad se hace contra `backend/docs/swagger.json`
  (artefacto JSON) y contra fixtures doradas versionadas.
- **Depende de la spec 033** (`specs/033-frontend-layering-hardening/`): la
  Fase C trabaja sobre la arquitectura que 033 establece (container + view +
  hook de dominio) y **no** reintroduce hooks en un `.view.tsx`. Los 5
  componentes que 033 parte en su Fase C (`SmtpConfigModal`, `SeedingProgressModal`,
  `MFASetupModal`, `ImportModal`, `ShiftHistoryModal`) deben tener su PR de
  033 mergeado antes de migrarse aquí. Cada componente migrado que hoy
  cuenta en el `LARGE_HOOKED_COMPONENT_BUDGET` de 033 (39) **decrementa ese
  budget** al partirse en container + view: son 8 de los 24
  (`SmtpConfigModal` 427, `EmployeeForm` 321, `SeedingOptionsModal` 275,
  `AddSupplierModal` 273, `MetersModal` 210, `MeterForm` 189, `UserForm` 170,
  `MFASetupModal` 161 — todos >150 líneas, con hooks y sin gemelo container).
- Rollback por fase: cada workstream (A–E) es un PR independiente.

## Trazabilidad

- **Tests que lo probarán**:
  - `frontend/src/tests/guardrails/formTableGuardrails.test.ts` (nuevo, AC7)
  - `frontend/src/tests/forms/*.test.ts` (nuevos: validación, foco al primer
    error, anti-doble-submit, AC2, AC3, AC4)
  - `frontend/src/tests/contracts/form-schema-parity.test.ts` (nuevo, AC2 —
    compara contra `backend/docs/swagger.json` y contra las fixtures
    doradas `frontend/src/tests/contracts/cases/*.json`)
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
