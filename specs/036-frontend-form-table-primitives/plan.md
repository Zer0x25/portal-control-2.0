# Plan 036: Frontend Form & Table Primitives

Spec: `./spec.md`. Constitución: `../constitution.md`.
Hermanos: `../033-frontend-layering-hardening/plan.md`,
`../035-frontend-testing-stack/plan.md`,
`../037-frontend-rendering-observability/plan.md`.

## Estrategia

5 workstreams (A→E). **A y B primero** (la capa y los schemas), porque la
migración de 24 formularios sin schemas sería reimplementar el mismo trabajo
24 veces.

**Precondición de orden**: la Fase C se ejecuta **sobre la arquitectura que
deja la spec 033** (container + view + hook de dominio). Los 5 componentes
que 033 parte en su Fase C (`SmtpConfigModal`, `SeedingProgressModal`,
`MFASetupModal`, `ImportModal`, `ShiftHistoryModal`) exigen su PR de 033
mergeado antes de migrarse aquí.

1. **Fase A — Capa de formulario (PR 1)**:
   - `frontend/src/hooks/useAppForm.ts`: wrapper de TanStack Form con:
     - validación Zod v4 **nativa** (Standard Schema: el schema se pasa
       directamente en `validators: { onSubmit, onChange }`; **no** se añade
       `@tanstack/form-resolvers`, que no existe como paquete),
     - `mode` por defecto `"onSubmit"` con revalidación `onChange` tras el
       primer submit (evita el patrón "error antes de tocar el campo"),
     - normalización de `values` (trim de strings, `undefined` → `null` en
       campos opcionales) **antes** del submit, para no enviar
       `""` donde el backend espera `null`,
     - foco al primer campo inválido tras un submit fallido,
     - `isSubmitting` expuesto y un helper `withSubmitGuard(ref)` que
       implementa el **ref sincrónico** anti-doble-submit (invariante 5 de
       `.agents/rules/frontend-performance.md`),
     - mensajes de error en español con un mapa central (`errorMessages.ts`)
       para que "RUT inválido" se diga igual en todos los formularios.
   - Los componentes de `components/ui/` (`Input`, `Select`, `Checkbox`,
     `Switch`, `Textarea`, `DatePickerDialog`, `TimePickerDialog`,
     `NumericKeypad`) **no se reemplazan**. El ajuste es **quirúrgico**:
     `Input`, `Select`, `Textarea` y `Checkbox` **ya aceptan `error?: string`**
     y ya calculan `aria-invalid` y `aria-describedby`; el defecto real es que
     `Input.tsx:25` y `Textarea.tsx:24` dependen de que el consumidor pase
     `id` (`aria-describedby={error && id ? ... : undefined}`) mientras que
     `Select.tsx:17` y `Checkbox.tsx:10` ya usan `useId()` como fallback. Se
     añade ese **fallback con `useId()`** a `Input`, `Textarea` y `Switch`
     (que además no tiene `label` ni `error`), sin introducir una segunda
     prop redundante.
2. **Fase B — Schemas de formulario (2 PR)**:
   - `frontend/src/schemas/forms/*.ts`: un schema por formulario de negocio,
     **derivado** de las reglas del backend
     (`backend/src/models/schemas/*.schemas.ts`, re-exportados por
     `backend/src/models/schemas.ts`) y de los tipos generados en
     `src/types/api-schema.ts` (`components["schemas"]`). No se duplica el
     contrato: si el SDK ya tipa el payload, el schema Zod **reutiliza** ese
     tipo.
   - `src/tests/contracts/form-schema-parity.test.ts`: para cada schema de
     formulario, una batería de casos límite (contraseña larga, hora en rango
     de jornada, fecha en la zona horaria del negocio, campos opcionales
     ausentes vs `""`) comparando el resultado del schema de frontend con el
     del backend. **El backend no se importa**: la comparación se hace contra
     el artefacto de contrato compartido `backend/docs/swagger.json`
     (`required`, `minLength`, `maxLength`, `pattern`, `enum`,
     `minimum`/`maximum`) y contra **fixtures doradas versionadas**
     (`src/tests/contracts/cases/*.json`) para las **19 reglas `.refine()`**
     del backend, que no son expresables en OpenAPI. El test falla si
     divergen.
   - **Divergencia conocida y documentada**: el frontend valida el **dígito
     verificador de RUT** (`EmployeeForm.tsx:78-97`) y el backend no
     (`employee.schemas.ts:6` solo exige `min(8)`). No es un caso de paridad:
     se documenta como regla **exclusiva del cliente**.
   - **Distinción explícita**: `src/types/schemas.ts` (27 schemas, validación
     de IndexedDB para la cola offline) **se mantiene**; los schemas de
     formulario son un subconjunto nuevo y con propósito distinto (entrada
     de usuario). Se documenta la diferencia para no mezclarlos.
3. **Fase C — Migración de formularios (5 PR, por riesgo)**:
   - Orden por riesgo y valor. **El `useAppForm` se instancia en el hook de
     dominio / controller o en el `.container.tsx`**; el `.view.tsx` recibe
     `values` / `errors` / `onChange` / `onSubmit` por props y **no** importa
     `useAppForm` (invariante de 033 AC1). Los 8 componentes migrados que
     hoy son >150 líneas con hooks y sin gemelo container **se parten** en
     container + view, lo que además decrementa el
     `LARGE_HOOKED_COMPONENT_BUDGET` de 033 (39 → 31).
   - 1. `theoretical-shifts` — `src/hooks/useShiftPatternForm.ts` (450),
        `src/hooks/useShiftAssignmentForm.ts` (233),
        `useLeaveManagerController.ts` (279),
        `components/HolidayForm.tsx` (130) — los hooks más grandes,
   - 2. `employee-management` + `meters` + `user-management` —
        `EmployeeForm.tsx` (321), `MeterForm.tsx` (189), `MetersModal.tsx`
        (210), `SingleMeterInputModal.tsx` (134), `UserForm.tsx` (170),
   - 3. `configuration` + `logbook` + `supervisor-dashboard` —
        `SmtpConfigModal.tsx` (427), `SeedingOptionsModal.tsx` (275),
        `useEmailCenterController.ts` (126), `AddSupplierModal.tsx` (273),
        `AddNoveltyModal.tsx` (144), `RejectionReasonModal.tsx` (112),
   - 4. `auth` + `worker-portal` + `dashboard` — `MFASetupModal.tsx` (161),
        `MFALoginModal.tsx` (114), `useChangePasswordModalController.ts` (97),
        `useForceChangePasswordModalController.ts` (60),
        `useCorrectionRequestModalController.ts` (144),
        `useQuickNotesModalController.ts` (56),
   - 5. `auth` (page) + `governance` + `time-control` — `LoginPage.tsx` (241),
        `useSystemMaintenanceController.ts` (288),
        `useTimestampEditor.ts` (110, estado en el store).
   - En cada migración: **el payload enviado al backend no cambia** (mismo
     shape, mismos nombres). Solo cambia quién manage el estado y quién
     valida. Esto se verifica con los e2e de cada flujo.
   - **Fuera de alcance (no son formularios)**: `SeedingProgressModal` (353),
     `ShiftHistoryModal` (276), `ClosedReportsModal` (308), `ImportModal`
     (283), `ExportLogsModal` (161) y `QuickActionModal`.
4. **Fase D — Capa de data grid (3 PR)**:
   - `frontend/src/components/ui/DataTable.tsx` + `DataTableHeader.tsx` +
     `DataTableRow.tsx`: primitivas **headless sobre TanStack Table**, con
     el diseño actual (tokens `token-*`, tipografía `typo-ui-*`, densidad
     industrial) y **accesibilidad de tabla**: `role="grid"`,
     `aria-rowcount`, `aria-colcount`, cabeceras ordenables como `<button>`
     con `aria-sort`, y navegación por teclado.
   - `frontend/src/hooks/useReportTable.ts`: hook con el estado de
     ordenamiento, paginación y **el cálculo de subtotales** extraído a una
     **función pura** (`src/utils/reportSubtotals.ts`) que es testeable de
     forma unitaria sin renderizar nada — hoy está enterrado dentro del
     componente de 549 líneas.
   - **El ordenamiento se resuelve ANTES de calcular los subtotales**: hoy
     `ReportTable.tsx` no ordena, recibe `sortedReportData` ya ordenado desde
     `useReportsTabController.ts:104-130` e intercala las filas
     `{ type: "subtotal" }` (`:88`) y `{ type: "total" }` (`:102`) entre los
     días **antes** de paginar. La primitiva usa `manualSorting` (o el sort
     se mantiene en el controller y el hook de tabla solo pagina) para que
     ordenar después de la inyección no mezcle subtotales y días.
   - Migración de `ReportTable.tsx` (549) → usa las primitivas nuevas.
     **Se reconstruyen las dos tablas** (`renderSummaryTable()` sobre
     `ReportStat[]` y `renderDailyTable()` sobre
     `(DailyReportItem | ReportSubtotal)[]`), no solo una.
     `SortableHeader` (59) y `PaginationControls` (98) **se integran** en
     `DataTableHeader`/`DataTable` **conservando su exportación**: su segundo
     consumidor es `features/employee-management/components/EmployeeListCard.tsx:5-6`,
     y `src/tests/components/PaginationControls.test.tsx` los cubre.
   - **Certificación de las primitivas nuevas**: `DataTable.tsx`,
     `DataTableHeader.tsx` y `DataTableRow.tsx` se registran en
     `frontend/design-system-certified.json` **y** en los dos mecanismos de
     paridad que exige `.agents/rules/design-system-governance.md` §7:
     `frontend/scripts/audit-design-system.cjs` (que lee ese JSON como fuente
     única) y
     `frontend/src/tests/guardrails/designSystemGuardrails.test.ts`. Si
     `ReportTable.tsx` se renombra o se mueve, el JSON se actualiza en el
     mismo PR.
   - La bifurcación **desktop/mobile** (`ReportTableMobileSummaryCard` +
     `ReportTableMobileDailyCard` vía `ResponsiveView`) **se conserva**: la
     tabla en desktop y las cards en mobile son dos vistas legítimas del
     mismo dato; la primitiva provee los datos, no el layout.
   - **Extensión a las otras tablas**: `TimeRecordRow` (327),
     `AuditLogFilterPanel` (457), `AuditLogsView` (405),
     `IntegrityAnomalyTable` — evaluación caso por caso de si la primitiva
     nueva aporta o si la tabla es tan específica que forzarla la empeora.
     Criterio: **migrar solo donde la primitiva encaja**; documentar las
     excepciones.
5. **Fase E — Guardrails (1 PR)**:
   - `frontend/src/tests/guardrails/formTableGuardrails.test.ts`:
     (a) ficheros que cumplen el criterio de inventario del Problema 1 del
     spec — **(a) componente** con `useState` + handler de envío + campo de
     entrada, o **(b) hook de dominio** con `useState` + handler de envío →
     whitelist con **budget decreciente** inicializado al conteo real
     medido (**baseline: 34** = las 32 entradas del detector + 2 que este no
     ve; quedan 10 sin migrar — 2 por evaluar y 8 hooks de datos/orquestadores
     con motivo anotado);
     (b) componentes que declaran `sortConfig`/`requestSort` → deben usar la
     primitiva de tabla o estar en la whitelist;
     (c) tablas ordenables → deben exponer `aria-sort`;
     (d) componentes migrados a `useAppForm` → no conservan `useState` de
     valores, y los `.view.tsx` no instancian `useAppForm`.
   - Extender el a11y e2e (`e2e/a11y.spec.ts`) con la tabla de reportes.

## Archivos a tocar

| Archivo                                                                               | Cambio                                                                                                           |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `frontend/package.json`                                                               | `@tanstack/react-form`, `@tanstack/react-table` (runtime). **Sin** `@tanstack/form-resolvers` (no existe en npm) |
| `frontend/src/hooks/useAppForm.ts`                                                    | **nuevo** — wrapper de TanStack Form + Zod v4 (Standard Schema)                                                  |
| `frontend/src/utils/errorMessages.ts`                                                 | **nuevo** — mensajes de error centralizados en español                                                           |
| `frontend/src/schemas/forms/*.ts`                                                     | **nuevo** — schemas Zod de entrada de usuario                                                                    |
| `frontend/src/schemas/index.ts`                                                       | **nuevo** — índice + re-export                                                                                   |
| `frontend/src/components/ui/DataTable.tsx`                                            | **nuevo** — primitiva headless sobre TanStack Table                                                              |
| `frontend/src/components/ui/DataTableHeader.tsx`, `DataTableRow.tsx`                  | **nuevos** — a registrar en `design-system-certified.json`                                                       |
| `frontend/src/hooks/useReportTable.ts`                                                | **nuevo** — estado de sort/paginación                                                                            |
| `frontend/src/utils/reportSubtotals.ts`                                               | **nuevo** — función pura de subtotales (extraída del componente)                                                 |
| `frontend/src/components/ui/ReportTable.tsx`                                          | reescribir sobre la primitiva (549 → objetivo ≤ 250)                                                             |
| `frontend/src/components/ui/SortableHeader.tsx`, `PaginationControls.tsx`             | integrar en la primitiva **conservando su exportación** (`EmployeeListCard.tsx` los usa)                         |
| `frontend/src/components/ui/{Input,Textarea,Switch}.tsx`                              | **fallback `useId()`** para `id`/`htmlFor`/`aria-describedby`; `Switch` gana `label` y `error`                   |
| `frontend/src/components/ui/{Select,Checkbox}.tsx`                                    | **sin cambios**: ya usan `useId()` y `error?: string`                                                            |
| `frontend/src/hooks/useShiftPatternForm.ts`, `useShiftAssignmentForm.ts`              | migrar a `useAppForm` (450 y 233 líneas)                                                                         |
| `frontend/src/hooks/useTimestampEditor.ts`                                            | migrar a `useAppForm` (110 líneas; hoy el estado vive en el store)                                               |
| `frontend/src/features/*/components/{*Form,*Modal}.tsx` (13 del inventario)           | migrar a `useAppForm` + schema; 8 de ellos se parten en container + view                                         |
| `frontend/src/features/*/hooks/use*Controller.ts` (11 del inventario)                 | migrar a `useAppForm` + schema                                                                                   |
| `frontend/src/features/auth/pages/LoginPage.tsx`                                      | migrar a `useAppForm` + schema                                                                                   |
| `frontend/src/features/time-control/components/TimeRecordRow.tsx`                     | evaluar migración a la primitiva de tabla                                                                        |
| `frontend/src/features/governance/components/{AuditLogFilterPanel,AuditLogsView}.tsx` | evaluar migración                                                                                                |
| `frontend/src/tests/guardrails/formTableGuardrails.test.ts`                           | **nuevo**                                                                                                        |
| `frontend/package.json`                                                               | registrar el guardrail en `test:guardrails` y `lint:guardrails`                                                  |
| `frontend/src/tests/contracts/form-schema-parity.test.ts`                             | **nuevo**                                                                                                        |
| `frontend/src/tests/contracts/cases/*.json`                                           | **nuevos** — fixtures doradas para las reglas `.refine()` del backend                                            |
| `frontend/src/tests/forms/*.test.ts`                                                  | **nuevos**                                                                                                       |
| `frontend/src/tests/tables/*.test.ts`                                                 | **nuevos**                                                                                                       |
| `frontend/e2e/a11y.spec.ts`                                                           | extender con la tabla de reportes                                                                                |
| `frontend/design-system-certified.json`                                               | registrar `DataTable*` (y `ReportTable.tsx` si se renombra)                                                      |
| `.agents/rules/design-system-governance.md`                                           | sección "Formularios y tablas"                                                                                   |
| `.agents/rules/frontend-performance.md`                                               | invariante 5 ampliada                                                                                            |
| `docs/adr/0025-frontend-form-table-primitives.md`                                     | decisión permanente                                                                                              |

## Contratos afectados

- **Backend / `swagger.json` / SDK: ninguno.** Los schemas de formulario se
  **derivan** de las reglas del backend, pero el contrato HTTP no cambia: el
  payload enviado es idéntico al de hoy.
- **Contrato de los componentes de `components/ui/`**: `Input`, `Select`,
  `Textarea` y `Checkbox` **ya aceptan `error?: string`** y ya calculan
  `aria-invalid` y `aria-describedby`; **no se introduce una segunda prop**
  (`errorMessage` sería redundante). El cambio es un **fallback `useId()`** en
  `Input`, `Textarea` y `Switch`, más `label` y `error` en `Switch`. Las props
  existentes no cambian → **compatible**; los 40+ consumidores actuales siguen
  funcionando.
- **`ReportTable` es un archivo certificado**
  (`frontend/design-system-certified.json`): si se renombra o se mueve, hay
  que actualizar ese JSON **en el mismo PR** (invariante de ADR-0020 §7), y
  la paridad con `frontend/scripts/audit-design-system.cjs` se verifica. Las
  primitivas nuevas (`DataTable`, `DataTableHeader`, `DataTableRow`) **se
  certifican** en el mismo PR: se añaden al JSON y a los dos mecanismos de
  paridad de §7 (el script auditor y
  `frontend/src/tests/guardrails/designSystemGuardrails.test.ts`).
- **E2E**: los `data-testid` no se renombran; los flujos de formulario
  (empleado, reporte de turno, SMTP, contraseña, MFA) son el contrato de
  regresión.
- **Bundle**: TanStack Form (~5 kB) y TanStack Table (~12 kB) entran al
  bundle de producción. Se mitiga con `manualChunks` si el budget de bundle
  lo exige (el chunk `vendor` actual es de 70 kB gzip 23 kB).

## Riesgos y rollback

| Riesgo                                                               | Mitigación                                                                                                                                          | Rollback                                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| El payload enviado al backend cambia por la normalización de valores | los tests de paridad de la Fase B comparan el payload **exacto** que se envía hoy vs el nuevo                                                       | revertir la migración de ese formulario               |
| La validación del frontend **rechaza** algo que el backend aceptaba  | la paridad se testea **antes** de migrar cada formulario; el schema parte de las reglas del backend, no al revés                                    | relajar el schema con justificación en el PR          |
| La paridad se mide contra un artefacto que no cubre todas las reglas | las **19 reglas `.refine()`** no son expresables en OpenAPI: se cubren con fixtures doradas versionadas, revisadas al cambiar el schema del backend | regenerar las fixtures en el PR que cambia el backend |
| Un import cruzado `frontend/` → `backend/` rompe `tsc` y el CI       | la paridad se hace contra `backend/docs/swagger.json` (JSON) y fixtures; **prohibido** importar `backend/src/**` desde `frontend/src/**`            | mover el test al paquete `backend/` si hiciera falta  |
| Los 24 formularios migrados a la vez rompen algo                     | 5 PR por riesgo, e2e en verde en cada uno                                                                                                           | revertir el PR del feature                            |
| Un mensaje de error nuevo cambia el tono del producto                | mapa central `errorMessages.ts` revisado en el PR; el copy se somete al mismo criterio que el resto de la UI                                        | ajustar el mapa                                       |
| `ReportTable` es certificado y su reescritura es grande              | migración en 3 PR (primitiva → hook de subtotales → migración), con el golden test de subtotales como red                                           | revertir a la versión previa                          |
| La tabla cambia de aspecto al migrar                                 | la regresión visual de la spec 035 (si ya está) sirve de golden; si no, se compara manualmente en claro y oscuro                                    | ajustar estilos en la primitiva                       |
| Los 24 formularios migrados a la vez rompen algo                     | 5 PR por riesgo, e2e en verde en cada uno                                                                                                           | revertir el PR del feature                            |
| TanStack Form/Table aumentan el bundle                               | medir el bundle antes/después; `manualChunks` si procede                                                                                            | revertir la migración                                 |
| `useShiftPatternForm` (450 líneas) es un caso extremo                | se migra **primero** (Fase C-1) para descubrir los problemas del patrón antes de aplicarlo a 23 más                                                 | ajustar el wrapper `useAppForm`                       |

## Verificación

```bash
cd frontend
npm run check                                   # tsc tras cada migración
npm run lint                                    # budget 0/0
npm run test:run -- src/tests/forms src/tests/tables src/tests/contracts
npm run test:guardrails                         # incluye formTableGuardrails
npm run validate:ci
npm run e2e:staging                             # 56 tests: formularios y flujos

# Raíz
npm run spec:check
npm run docs:check
npm run preflight
```
