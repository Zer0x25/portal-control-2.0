# Tareas 036: Frontend Form & Table Primitives

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## Fase A — Capa de formulario

- [x] T1: Añadir `@tanstack/react-form` y `@tanstack/react-table` (runtime) a
      `frontend/package.json`. **No** añadir `@tanstack/form-resolvers`: ese
      paquete **no existe** en npm (404 en el registry) y no hace falta,
      porque `@tanstack/react-form` v1 consume **Standard Schema** y
      `zod ^4.6.5` (ya instalado) es Standard Schema nativo (AC1).
- [x] T2: Crear `frontend/src/hooks/useAppForm.ts`: wrapper de TanStack Form
      con el schema Zod pasado **directamente** en el campo `validators`
      (soporte Standard Schema), con `mode: "onSubmit"` y revalidación
      `onChange` tras el primer submit, normalización de `values` (`trim`,
      `undefined` → `null` en opcionales) antes del submit, foco al primer
      campo inválido, `isSubmitting` expuesto y helper `withSubmitGuard(ref)`
      con el **ref sincrónico** anti-doble-submit (AC1, AC4).
- [x] T3: Crear `frontend/src/utils/errorMessages.ts` con el mapa central de
      mensajes de error en español (RUT, contraseña, rango horario, fecha,
      requerido, duplicado) para que el mismo error se exprese igual en todos
      los formularios (AC2).
- [x] T4: Arreglar la a11y de error en `components/ui/`. **No** se introduce
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

### Nota de ejecución — Fase A (PR 1 de la spec 036)

**Decisiones que se apartan del plan original (documentadas aquí porque
afectan a las fases siguientes):**

1. **`undefined` NO se convierte en `null`; `""` sí, y solo en los campos
   declarados opcionales.** El plan decía "`undefined` → `null` en
   opcionales", pero eso **cambia el payload**: `JSON.stringify` omite las
   claves `undefined` y las convierte en `null`, así que el backend recibiría
   campos que antes no recibía (violando el AC8/T13: "el payload enviado es
   idéntico"). La normalización implementada es: `trim` de cadenas +
   `""` → `null` **solo** en los campos listados en `nullableFields`
   (`useAppForm.ts:normalizeFormValues`). La coerción específica de un
   campo (`""` → `null`) puede seguir exprésandose en el schema Zod de la
   Fase B, que es donde corresponde.
2. **El modo de validación no se implementa con `validationLogic`, sino
   filtrando la exposición de los errores.** TanStack Form v1 ofrece
   `revalidateLogic({ mode: "submit", modeAfterSubmission: "change" })`, pero
   su implementación sigue ejecutando el validador `onChange` antes del
   primer envío (`@tanstack/form-core/ValidationLogic.js`). El contrato
   pedido ("nada de errores hasta el primer envío; después, revalidación en
   vivo") se implementa en `useAppForm` exponiendo los errores solo cuando
   `submissionAttempts > 0`; la librería sí recalcula en cada cambio.
3. **`useId()` en las primitivas obliga a matizar el guardrail de la spec 033.** `HOOKED_COMPONENT_BUDGET` (95) contamos componentes que llaman a
   **cualquier** hook; con el fallback `useId()` de T4 el conteo subía a 98
   (roto). `useId` no gestiona estado (no hay `useState`, `useEffect` ni
   re-render), así que el guardrail ahora distingue **hooks con estado** de
   **hooks puros** (`PURE_HOOK_NAMES = { useId }`) y el budget **baja** de 95
   a **93** (ratchet monótono, sin subir). El cambio está en
   `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts`, con una sonda
   propia que verifica la distinción. La lista de vistas (`VIEW_HOOK_BUDGET`)
   sigue contando cualquier hook: ESLint sigue prohibiendo `useId` en vistas.
4. **El ratchet de cobertura sube** (spec 003 G-02): la capa de formulario y
   sus tests suben la cobertura medida de L 33.57 / F 29.37 / B 27.16 /
   S 32.94 a **L 35.76 / F 31.18 / B 28.87 / S 35.61**; los umbrales de
   `frontend/vite.config.ts` suben a 34 / 29 / 27 / 33 (nunca bajan).

**Evidencia:**

| Artefacto                       | Ubicación                                                        |
| ------------------------------- | ---------------------------------------------------------------- |
| Capa de formulario              | `frontend/src/hooks/useAppForm.ts`                               |
| Mapa central de mensajes        | `frontend/src/utils/errorMessages.ts`                            |
| a11y de error de las primitivas | `frontend/src/components/ui/{Input,Textarea,Switch}.tsx`         |
| Tests de la capa                | `frontend/src/tests/forms/useAppForm.test.tsx` (11 casos)        |
| Tests del mapa de mensajes      | `frontend/src/tests/forms/errorMessages.test.ts` (10 casos)      |
| Tests de a11y de las primitivas | `frontend/src/tests/forms/formPrimitivesA11y.test.tsx` (7 casos) |
| Matiz del guardrail de 033      | `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts`     |
| Ratchet de cobertura            | `frontend/vite.config.ts` (34 / 29 / 27 / 33)                    |

## Fase B — Schemas de formulario

- [x] T5: Crear `frontend/src/schemas/forms/*.ts` con un schema Zod de
      **entrada de usuario** por formulario de negocio, derivado de las
      reglas del backend (`backend/src/models/schemas/*.schemas.ts`,
      re-exportados por `backend/src/models/schemas.ts` — **no**
      `backend/src/modules/**/schemas`, que no existe) y **reutilizando** los
      tipos de `src/types/api-schema.ts` (`components["schemas"]`) en lugar
      de duplicar el contrato (AC2).
- [x] T6: Documentar la distinción entre `src/types/schemas.ts` (27 schemas
      de validación de IndexedDB para la cola offline, **se mantiene**) y los
      nuevos schemas de formulario (entrada de usuario), y registrar la
      **divergencia deliberada** del dígito verificador de RUT: el frontend
      lo valida (`EmployeeForm.tsx:78-97`) y el backend no
      (`employee.schemas.ts:6` solo exige `min(8)`) (AC2).
- [x] T7: Crear `frontend/src/tests/contracts/form-schema-parity.test.ts`:
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

### Nota de ejecución — Fase B (PR 2 de la spec 036)

**Cómo se verifica la paridad (decisión de diseño):**

La comparación **no** es "el mismo caso contra dos implementaciones" (el
backend no se puede importar desde `frontend/`), sino **declarativa y
exhaustiva**: se genera el JSON Schema del schema Zod con la API pública
`z.toJSONSchema(schema, { target: "openapi-3.0", io: "input" })` y se
compara atributo a atributo con `backend/docs/swagger.json`
(`required`, `minLength`, `maxLength`, `pattern`, `enum`, `minimum`,
`maximum`, `format`, `nullable`). El test falla si el formulario se salta una
constraint del backend, si se inventa una, o si escribe un campo que la API
no conoce. Las **aserciones de tipo** (`z.output<typeof schema>` vs
`components["schemas"][...]`) cubren la otra mitad: si el backend cambia un
tipo, el frontend no compila.

**Los fixtures dorados** (`src/tests/contracts/cases/*.json`) cubren las
reglas que OpenAPI **no puede expresar** (los `.refine()`/`.superRefine()` del
backend): el dígito verificador del RUT, el remitente SMTP vacío, la regla de
correo activa sin destinatario y el motivo de rechazo obligatorio. Son el
registro dorado del comportamiento del backend: si el backend cambia una de
esas reglas, el fixture falla y obliga a revisar el schema **y** el fixture.

**Divergencias y tolerancias documentadas:**

| Caso                                | Decision                                                                                                                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxHoursPattern`                   | El frontend exigia `min(0)` y el backend no lo declara: se **quita** (el frontend no puede ser mas estricto que el contrato).                                                                                               |
| `shiftReportsPerDay`                | El generador OpenAPI del backend pierde el `.int()` (lo deja como `number`); el frontend mantiene el entero, que es lo que el backend exige en el codigo. La comparacion tolera `integer` vs `number` **solo** en ese caso. |
| `smtpProfileForm`                   | El perfil SMTP es el **item** de `EmailConfig.profiles`, no el objeto: el mapa de contratos declara `openApiPath: "profiles.items"`.                                                                                        |
| `changePasswordForm`                | `passwordConfirm` es local (`localFields`) y `password` es obligatorio aunque el backend lo admita opcional (`stricterRequired`).                                                                                           |
| `correctionRequestForm`             | `requestedValue` se transforma antes de enviarlo (el formulario captura `YYYY-MM-DDTHH:mm` y el controller lo pasa a ISO-8601 con offset): `transformedFields`.                                                             |
| `quickNoteForm`, `meterReadingForm` | `authorUsername` lo deduce el servidor: el payload se comprueba contra `Omit<Contrato, "authorUsername">`.                                                                                                                  |
| `sendTestEmailForm`                 | `subject`/`message` son opcionales **con valor por defecto** en el backend (`z.string().optional().default("")`); el schema del frontend replica el `.default("")` para que el payload generado tenga los mismos tipos.     |

**Cobertura de los 24 formularios:** 25 schemas de formulario (22 con
contrapartida OpenAPI, 3 locales sin backend). Los tres locales
(`localSupplierForm`, `localNoveltyForm`, `localMeterConfigForm`) estan
listados en `LOCAL_ONLY_FORM_SCHEMA_IDS`: son datos del navegador y no
tienen schema OpenAPI con el que verificar la paridad.

**Evidencia:**

| Artefacto                | Ubicación                                                              |
| ------------------------ | ---------------------------------------------------------------------- |
| Schemas de formulario    | `frontend/src/schemas/forms/*.ts` (12 ficheros)                        |
| Mapa de contratos        | `frontend/src/schemas/index.ts` (`FORM_SCHEMA_CONTRACTS`)              |
| Documentacion del modulo | `frontend/src/schemas/README.md`                                       |
| Comparador OpenAPI       | `frontend/src/tests/contracts/openApiSchema.ts`                        |
| Test de paridad          | `frontend/src/tests/contracts/form-schema-parity.test.ts` (27 casos)   |
| Test de fixtures dorados | `frontend/src/tests/contracts/form-schema-fixtures.test.ts` (21 casos) |
| Fixtures dorados         | `frontend/src/tests/contracts/cases/*.json` (4 ficheros)               |

## Fase C — Migración de formularios (5 PR, por riesgo)

**Invariante de la spec 033**: el `useAppForm` se instancia en el **hook de
dominio / controller** (`features/<dominio>/hooks/use*Controller.ts`) o en el
`.container.tsx`; el `.view.tsx` recibe `values` / `errors` / `onChange` /
`onSubmit` por props y **no** importa `useAppForm`. Los 5 componentes que la
spec 033 parte en su Fase C (`SmtpConfigModal`, `SeedingProgressModal`,
`MFASetupModal`, `ImportModal`, `ShiftHistoryModal`) exigen su PR de 033
mergeado antes.

- [x] T8: Migrar `theoretical-shifts`: `src/hooks/useShiftPatternForm.ts`
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
      **Dividido en dos PR** (T9a y T9b) por el riesgo que acumulan: los tres
      formularios de `meters` comparten un schema **dinámico** (una lectura por
      medidor) que no se parece en nada a los otros cuatro.
- [ ] T10: Migrar `configuration`, `logbook` y `supervisor-dashboard`:
      `SmtpConfigModal.tsx` (427), `SeedingOptionsModal.tsx` (275),
      `configuration/hooks/useEmailCenterController.ts` (126),
      `AddSupplierModal.tsx` (273), `AddNoveltyModal.tsx` (144) y
      `RejectionReasonModal.tsx` (112) a `useAppForm` + schema
      (AC1, AC2, AC3).
      **Dividido en dos PR** (T10a y T10b): los tres formularios de la
      libreta y del panel de supervisor son locales (no tienen contraparte
      en el backend), mientras que los tres de `configuration` hablan con
      el backend (`EmailConfig`, `SendTestEmail`, seeding) y necesitan sus
      schemas contractuales.
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

### Nota de ejecución — Fase C, PR 3 (T8: `theoretical-shifts`)

**Los cuatro formularios migrados a `useAppForm` + schema:**

| Formulario          | Hook / controller                                   | Schema con contexto          |
| ------------------- | --------------------------------------------------- | ---------------------------- |
| Patrón de turno     | `src/hooks/useShiftPatternForm.ts`                  | `buildShiftPatternSchema`    |
| Asignación de turno | `src/hooks/useShiftAssignmentForm.ts`               | `buildShiftAssignmentSchema` |
| Ausencia            | `features/.../hooks/useLeaveManagerController.ts`   | `buildLeaveFormSchema`       |
| Feriado             | `features/.../hooks/useHolidayManagerController.ts` | `buildHolidayFormSchema`     |

**Hallazgos que obligan a cambiar el patrón (afectan a T9-T13):**

1. **Las reglas que dependen del contexto NO pueden vivir en un schema
   estático**: el nombre único, el máximo legal de horas, el solapamiento de
   ausencias y la fecha de feriado ocupada dependen de datos que solo conoce
   la aplicación. La solución es un **constructor de schema**
   (`build*Schema(context)`) que mete el contexto en un `superRefine`, alimentado
   con `useMemo` para que el schema solo se reconstruya cuando cambia el
   contexto. El error sale como error de campo (AC2, AC3) y no como `toast`.
2. **La capa necesita tres cosas que no tenía (T8)**: `serialize` (el payload
   final puede ser distinto del estado: el patrón viaja sin las horas
   derivadas y con las cadenas vacías restauradas), `reset(values)` (el
   formulario se reinicia con valores concretos) y un genérico `TPayload` (el
   payload tiene su propio tipo cuando hay serialización). `reset` actualiza
   además la referencia viva de `defaultValues`: TanStack Form re-aplica
   `defaultValues` en cada actualización de opciones si el formulario no está
   "tocado", así que un `reset` que no la actualiza se deshace en el siguiente
   render.
3. **Bug de la capa (corregido aquí): la normalización dejaba errores
   obsoletos.** La normalización ocurre **después** de la última validación en
   vivo, y escribe los valores con `dontValidate`. Un campo opcional vacío
   (una fecha sin fin) es inválido para el schema (`YYYY-MM-DD`) pero válido
   una vez normalizado (`undefined`): TanStack conservaba el error viejo y
   **bloqueaba el envío de un formulario correcto** (`isFieldsValid` es falso
   → `handleSubmit` no llama a `onSubmit`). El fix es refrescar la validación
   tras normalizar (`form.validate("change")` en `useAppForm.submit`), que
   además es lo que mantiene vivo el error en vivo del resto de campos.
4. **Bug de los hooks (corregido aquí): `reset`/`form` en las dependencias de
   un `useEffect`provocaba un bucle de render.** El objeto que devuelve
   `useAppForm` es nuevo en cada render, así que un `useEffect` que dependía de
   él se re-ejecutaba en bucle (`Maximum update depth exceeded`). La solución
   es depender del `reset` **desestructurado** (estable) y no del objeto.
5. **Una regla del código anterior era código muerto**: la comprobación de que
   la hora de fin fuese posterior a la de inicio nunca rechazaba nada, porque
   `calculateHoursBetween` **nunca devuelve un valor negativo** (trunca a 0 y
   suma un día al final, para admitir turnos que cruzan la medianoche). La
   migración **preserva el comportamiento** (no inventa un rechazo nuevo) y
   lo documenta en el schema.
6. **El conflicto de solapamiento de asignaciones NO es una regla de
   validación**: abre un modal que pregunta cómo resolverlo, así que lo
   decide el hook, no el schema (lo mismo con la copia/pega de jornadas).
7. **Ratchet de la spec 033:** `HolidayForm.tsx` pasa a ser presentación pura
   (el estado vive en `useHolidayManagerController`), así que
   `HOOKED_COMPONENT_BUDGET` **baja de 93 a 92**
   (`frontend/src/tests/guardrails/viewPurityGuardrails.test.ts`).
   `LARGE_HOOKED_COMPONENT_BUDGET` sigue en 56.

**Payload idéntico al anterior (T13, verificado en esta tarea):** los tests
comprueban el cuerpo de la petición (mismos nombres de campo, mismos valores,
las horas derivadas fuera, `endDate` omitido cuando el turno es indefinido y
las notas como cadena vacía), que es el invariante que la spec 036 no puede
permitir que se rompa en silencio.

**Evidencia:**

| Artefacto                        | Ubicación                                                            |
| -------------------------------- | -------------------------------------------------------------------- |
| Schemas con contexto             | `frontend/src/schemas/forms/{shift,leave,holiday}.ts`                |
| Tests de reglas contextuales     | `frontend/src/tests/forms/contextualSchemas.test.ts` (22 casos)      |
| Tests de los cuatro formularios  | `frontend/src/tests/forms/theoreticalShiftsForms.test.tsx` (8 casos) |
| Tests de la capa (serialización) | `frontend/src/tests/forms/useAppForm.test.tsx` (16 casos)            |
| Ratchet de la spec 033           | `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts`         |
| Mock global de IndexedDB         | `frontend/src/tests/setup.ts` (`idbGetAll` y familia)                |

### Nota de ejecución — Fase C, PR 4 (T9a: `employee-management` + `user-management`)

**Los dos formularios migrados a `useAppForm` + schema:**

| Formulario               | Hook / controller                                                 | Schema con contexto       |
| ------------------------ | ----------------------------------------------------------------- | ------------------------- |
| Alta/edición de empleado | `features/employee-management/hooks/useEmployeeFormController.ts` | `buildEmployeeFormSchema` |
| Alta/edición de usuario  | `features/user-management/hooks/useUserFormController.ts`         | `buildUserFormSchema`     |

**Hallazgos que obligan a cambiar el patrón (afectan a T9b y T10-T13):**

1. **El schema del formulario y el del contrato no siempre son el mismo
   objeto.** El formulario de empleado escribe `area` y `workdayType`, que el
   backend **acepta y guarda** (`EmployeeService` los escribe) pero que su
   schema Zod **no declara**: no son campos locales (si viajan) ni una perdida
   silenciosa. El mapa de contratos suma una lista para ese caso
   (`openApiUndeclaredFields`: "el backend lo acepta y lo guarda, pero su
   OpenAPI no lo declara") y el comparador de paridad la respeta. El resto de
   las divergencias (`position` obligatorio, el digito verificador del RUT)
   siguen declaradas como hasta ahora.
2. **Un error sin `path` es un error de formulario, no de campo**: la capa lo
   expone como `formError` (la clave `""` del estado de TanStack Form), no
   como el error de un input. El formulario de usuario lo necesita porque la
   regla de la contraseña del alta no tiene campo (la pantalla muestra la
   temporal que asigna el backend, no un input). La capa se corrige para que
   `formError` lea esa clave.
3. **El formulario de usuario no tiene campo de contraseña** (preexistente):
   el alta exige la contraseña desde siempre, pero el componente nunca la
   pidio, asi que el flujo de alta de usuario esta roto en la aplicacion (el
   padre avisaba por `toast` y no creaba nada). La migracion **no arregla el
   producto**: reproduce el comportamiento (el envio se bloquea) y el error
   pasa a ser de formulario. Arreglarlo (un input de contraseña o una
   contraseña temporal que se envie) es una decision de producto.
4. **El estado del formulario y el payload no son lo mismo**: la normalizacion
   deja las claves vacias con valor `undefined` (las omite el `JSON.stringify`).
   Los tests comparan el **JSON** del payload, no el objeto, que es lo que
   viaja (T13).
5. **Ratchet de la spec 033:** `EmployeeForm.tsx` y `UserForm.tsx` pasan a ser
   presentacion pura (el estado vive en sus hooks de dominio), asi que
   `HOOKED_COMPONENT_BUDGET` **baja de 92 a 90** y
   `LARGE_HOOKED_COMPONENT_BUDGET` **baja de 56 a 54**
   (`frontend/src/tests/guardrails/viewPurityGuardrails.test.ts`). Con los tres
   formularios de medidores (T9b) baja a **87** y **52**.

**Payload idéntico al anterior (T13, verificado en esta tarea):** el alta de
empleado viaja con `{name, rut, position, area, workdayType, createUserAccount}`
(el email vacio no viaja) y la edicion con los mismos campos sobre el empleado
completo; el alta de usuario viaja con `{username, password, role, employeeId}`
y la edicion con `{role, employeeId}`.

**Evidencia:**

| Artefacto                     | Ubicación                                                           |
| ----------------------------- | ------------------------------------------------------------------- |
| Schemas con contexto          | `frontend/src/schemas/forms/{employee,user}.ts`                     |
| Tests de los dos formularios  | `frontend/src/tests/forms/employeeAndUserForms.test.tsx` (10 casos) |
| Fixtures dorados del empleado | `frontend/src/tests/contracts/cases/employee.cases.json` (+1 caso)  |
| Paridad de los contratos      | `frontend/src/tests/contracts/form-schema-parity.test.ts`           |
| Ratchet de la spec 033        | `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts`        |

### Nota de ejecución — Fase C, PR 5 (T9b: `meters`)

**Los tres formularios de medidores migrados a `useAppForm` + schema:**

| Formulario                        | Hook / controller                                          | Schema con contexto             |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------- |
| Lecturas de la página y del modal | `features/meters/hooks/useMeterReadingsFormController.ts`  | `buildMeterReadingsSchema`      |
| Lectura de un medidor             | `features/meters/hooks/useSingleMeterReadingController.ts` | `buildSingleMeterReadingSchema` |

**Hallazgos (afectan a T10-T13):**

1. **Las reglas de un medidor estaban escritas tres veces** (en `MeterForm.tsx`,
   en `MetersModal.tsx` y en `SingleMeterInputModal.tsx`, las dos ultimas
   copiadas de la primera). Ahora hay **una** funcion pura
   (`validateMeterValue` en `frontend/src/schemas/forms/meter.ts`) que los tres
   schemas usan: el texto del error sale del mapa central y el error va al
   medidor que lo incumple (no a un `toast` que no dice que campo es).
2. **Un formulario con claves dinamicas** (una entrada por medidor) necesita
   un schema `record`, no un objeto con campos fijos. El error de cada medidor
   viaja en el `path` del issue (`path: [meterConfigId]`), asi que la capa lo
   expone como el error de ese campo.
3. **La identidad de un array que viene de una consulta no es estable**
   (`data ?? []` crea un array nuevo en cada render): si un `useMemo` o un
   `useEffect` depende de esa referencia, el formulario se reinicia sin parar
   (bucle de actualizaciones). La dependencia estable es la **lista de ids**
   (`meterIdsKey`).
4. **Un campo transformado puede cambiar de tipo**: la lectura de un medidor
   es el **texto** que teclea el usuario (puede llevar el prefijo `+` de
   recarga) y el hook `useMeterReadings` lo convierte a numero. El comparador
   de paridad salta la comprobacion de tipo de los campos declarados como
   `transformedFields` (igual que ya hacia con el formato y el patron).
5. **`MetersModal.tsx` no lo usa nadie** (es codigo muerto: no aparece en
   ningun arbol de componentes). Se migra igualmente porque la T9 lo pide, pero
   la migracion no lo hace aparecer en ningun sitio: decidir si se borra es
   una decision de producto.

**Payload idéntico al anterior (T13, verificado en esta tarea):** la lectura
sigue viajando como la lista que construye `useMeterReadings.addReading` (que
no se ha tocado) a `/api/meters/bulk`; el formulario solo deja de enviar los
medidores sin valor (los omite, como antes).

**Evidencia:**

| Artefacto                | Ubicación                                                         |
| ------------------------ | ----------------------------------------------------------------- |
| Schemas con contexto     | `frontend/src/schemas/forms/meter.ts`                             |
| Tests de los formularios | `frontend/src/tests/forms/meterReadingsForms.test.tsx` (10 casos) |
| Paridad de los contratos | `frontend/src/tests/contracts/form-schema-parity.test.ts`         |
| Ratchet de la spec 033   | `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts`      |

### Nota de ejecución — Fase C, PR 6 (T10a: `logbook` + `supervisor-dashboard`)

**Los tres formularios migrados a `useAppForm` + schema:**

| Formulario            | Hook / controller                                                     | Schema                      |
| --------------------- | --------------------------------------------------------------------- | --------------------------- |
| Novedad de la libreta | `features/logbook/hooks/useNoveltyFormController.ts`                  | `localNoveltyFormSchema`    |
| Acceso vehicular      | `features/logbook/hooks/useSupplierFormController.ts`                 | `localSupplierFormSchema`   |
| Motivo de rechazo     | `features/supervisor-dashboard/hooks/useRejectionReasonController.ts` | `rejectionReasonFormSchema` |

**Hallazgos (afectan a T10b-T13):**

1. **Los schemas locales describian un formulario que la pantalla nunca
   mostro**: `localSupplierFormSchema` tenia nombre, RUT, telefono y notas
   (el formulario de proveedor de otra version del producto) y
   `localNoveltyFormSchema` tenia tipo, hora de inicio, hora de termino y
   justificacion. Venian del inventario de la T5 (la spec, no el codigo).
   Ahora describen el formulario real (la patente, el conductor, los
   pasajeros, la empresa, el motivo y la hora; la anotacion y su hora).
2. **Un formulario puede escribir solo una parte del contrato**: el modal de
   rechazo entrega **solo** el motivo (el estado y el supervisor los pone la
   pantalla que lo abre). Su schema es el subconjunto
   `{rejectionReason}` de `UpdateCorrectionStatus`, declarado en el mapa de
   contratos con `stricterRequired` (el backend lo exige solo cuando el
   estado es `rejected`).
3. **La hora de reloj necesita un helper compartido** (`clockTime`, patron
   `HH:mm`): lo escriben el selector de hora, la novedad y el acceso
   vehicular. El mensaje vive en el mapa central (`invalidTime`).
4. **La mascara de la patente se muda al hook** (`formatLicensePlateInput`),
   como la del RUT del empleado, y el schema acepta los **prefijos** que
   produce la mascara (`A`, `AB`, `AB-C`): la regla es "no puede seguir
   siendo una patente incompleta al enviar", no "tiene que tener seis
   caracteres".
5. **El boton que se deshabilita con los campos vacios desaparece**: con la
   capa de formulario el envio siempre esta disponible y los errores se
   muestran al enviar (es el comportamiento que pide el AC3). El `disabled`
   que queda es el del envio en vuelo.
6. **El estado de la pantalla (el selector de hora) vive en el hook**: una
   vista (`*.view.tsx`) no puede llamar a hooks (spec 033 AC1) y ningun
   container del repo guarda estado.

**Payload idéntico al anterior (T13, verificado en esta tarea):** la novedad
sigue entregando anotacion y hora por separado; el acceso vehicular sigue
entregando sus seis campos (`licensePlate`, `driverName`, `paxCount`,
`company`, `reason`, `time`); el rechazo sigue entregando **solo** el motivo.

**Guardrails actualizados en el mismo commit:** la whitelist de overlays
(`modalGuardrails.test.ts`), la lista de modales de dominio
(`uiLayeringGuardrails.test.ts`) y los archivos certificados del design system
(`frontend/design-system-certified.json`) apuntan a los `.view.tsx` nuevos.

**Evidencia:**

| Artefacto                | Ubicación                                                                |
| ------------------------ | ------------------------------------------------------------------------ |
| Schemas de formulario    | `frontend/src/schemas/forms/note.ts`, `.../correction.ts`                |
| Tests de los formularios | `frontend/src/tests/forms/logbookAndSupervisorForms.test.tsx` (13 casos) |
| Paridad de los contratos | `frontend/src/tests/contracts/form-schema-parity.test.ts`                |
| Ratchet de la spec 033   | `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts`             |

**Ratchet:** los presupuestos de la spec 033 bajan de **87** a **84** (los
componentes con estado) y de **52** a **51** (los grandes sin gemelo
container/view).

### Nota de ejecución — Fase C, PR 7 (T10b: `configuration`, parte 1)

**Los dos formularios migrados a `useAppForm` + schema:**

| Formulario                          | Hook / controller                                             | Schema                     |
| ----------------------------------- | ------------------------------------------------------------- | -------------------------- |
| Simulacion de datos                 | `features/configuration/hooks/useSeedingOptionsController.ts` | `seedingOptionsFormSchema` |
| Correo de prueba (centro de correo) | `features/configuration/hooks/useEmailCenterController.ts`    | `sendTestEmailFormSchema`  |

**Hallazgos (afectan a T10c-T13):**

1. **Un tipo que vive en un componente no puede consumirlo un service**: el
   tipo `SeedingOptions` estaba exportado por `SeedingOptionsModal.tsx` y lo
   importaban el `seedingService` y el modal de progreso (una inversion de
   capas). Ahora vive en la capa de schemas (`schemas/forms/seed.ts`).
2. **La validacion nativa del navegador se pierde con la capa de formulario**
   (`noValidate`): los limites de la pantalla (el maximo de empleados que se
   pueden sembrar, por ejemplo) solo estaban en los atributos `min`/`max` del
   `<input>`. Pasan al schema, y como el backend **no** acota esos campos, el
   mapa de contratos suma `stricterMaximum`: el comparador de paridad exige
   que el maximo del formulario no exceda al del backend, pero no que coincida
   (el minimo del backend si se sigue comparando).
3. **Un preset es un reinicio del formulario**, no un caso especial del
   envio: `reset(preset)` deja el formulario con los valores del preset (y
   el nivel incremental sigue siendo estado de la pantalla, no del
   formulario).
4. **El `sendTestEmailFormSchema` admitia `subject` y `message` vacios**
   (los `default("")` del backend) y el formulario los exige: se declaran con
   `stricterRequired` (el mismo mecanismo que el `position` del empleado).
5. **El centro de correo es una vista `UI-PROTECTED`**: el cambio es
   minimo (los enlaces al formulario y el mensaje de error de cada campo) y
   se señala en la descripcion del PR para que la revision lo vea.

**Payload idéntico al anterior (T13, verificado en esta tarea):** la
simulacion sigue enviando los mismos siete numeros y el correo de prueba el
mismo trio `{to, subject, message}`.

**Evidencia:**

| Artefacto                | Ubicación                                                        |
| ------------------------ | ---------------------------------------------------------------- |
| Schemas de formulario    | `frontend/src/schemas/forms/seed.ts`, `.../smtp.ts`              |
| Tests de los formularios | `frontend/src/tests/forms/configurationForms.test.tsx` (8 casos) |
| Paridad de los contratos | `frontend/src/tests/contracts/form-schema-parity.test.ts`        |
| Ratchet de la spec 033   | `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts`     |

**Ratchet:** los presupuestos de la spec 033 bajan de **84** a **83** (los
componentes con estado) y de **51** a **50** (los grandes sin gemelo
container/view).

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
