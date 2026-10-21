# Plan 036: Frontend Form & Table Primitives

Spec: `./spec.md`. Constitución: `../constitution.md`.
Hermanos: `../033-frontend-layering-hardening/plan.md`,
`../035-frontend-testing-stack/plan.md`,
`../037-frontend-rendering-observability/plan.md`.

## Estrategia

5 workstreams (A→E). **A y B primero** (la capa y los schemas), porque la
migración de 18 formularios sin schemas sería reimplementar el mismo trabajo
18 veces.

1. **Fase A — Capa de formulario (PR 1)**:
   - `frontend/src/hooks/useAppForm.ts`: wrapper de TanStack Form con:
     - resolver de Zod (`@tanstack/form-resolvers/zod`),
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
     `NumericKeypad`) **no se tocan**: solo se les añade la ability de
     recibir `aria-invalid` / `aria-describedby` / `errorMessage` de forma
     uniforme (una revisión mínima de props, sin cambio de API incompatible).
2. **Fase B — Schemas de formulario (2 PR)**:
   - `frontend/src/schemas/forms/*.ts`: un schema por formulario de negocio,
     **derivado** de las reglas del backend
     (`backend/src/modules/<dominio>/schemas.ts`) y de los tipos generados en
     `src/types/api-schema.ts` (`components["schemas"]`). No se duplica el
     contrato: si el SDK ya tipa el payload, el schema Zod **reutiliza** ese
     tipo.
   - `src/tests/contracts/form-backend-parity.test.ts`: para cada schema de
     formulario, una batería de casos límite (RUT chileno con y sin
     verificador; contraseña larga; hora en rango de jornada; fecha en zona
     horaria del negocio; campos opcionales ausentes vs `""`) comparando el
     resultado del schema de frontend con el del backend. El test falla si
     divergen.
   - **Distinción explícita**: `src/types/schemas.ts` (27 schemas, validación
     de IndexedDB para la cola offline) **se mantiene**; los schemas de
     formulario son un subconjunto nuevo y con propósito distinto (entrada
     de usuario). Se documenta la diferencia para no mezclarlos.
3. **Fase C — Migración de formularios (5 PR, por feature)**:
   - Orden por riesgo y valor:
     1. `theoretical-shifts` (`useShiftPatternForm` 450 líneas +
        `useShiftAssignmentForm` 233 + `HolidayForm` 130) — los hooks más
        grandes,
     2. `employee-management` (`EmployeeForm` 321, `ImportModal` 283,
        `ShiftHistoryModal` 276),
     3. `configuration` (`SmtpConfigModal` 427, `SeedingOptionsModal` 275,
        `SeedingProgressModal` 353),
     4. `logbook` (`AddSupplierModal` 273, `ClosedReportsModal` 308,
        `AddNoveltyModal` 144),
     5. `meters` + `user-management` + `governance` + `auth` +
        `supervisor-dashboard` (`MeterForm` 189, `MetersModal` 210,
        `SingleMeterInputModal` 134, `UserForm` 170, `ExportLogsModal` 161,
        `MFASetupModal` 161, `MFALoginModal` 114, `RejectionReasonModal` 112).
   - En cada migración: **el payload enviado al backend no cambia** (mismo
     shape, mismos nombres). Solo cambia quién manage el estado y quién
     valida. Esto se verifica con los e2e de cada flujo.
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
   - Migración de `ReportTable.tsx` (549) → usa las primitivas nuevas;
     `SortableHeader` (59) y `PaginationControls` (98) **se integran** en
     `DataTableHeader`/`DataTable` (se conserva su API pública o se migran
     sus 2-3 consumidores).
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
     (a) componentes con `useState` de `values`/`errors` de formulario en
     `features/` → whitelist con **budget decreciente** inicializado al
     conteo real medido (baseline: los 18 formularios);
     (b) componentes que declaran `sortConfig`/`requestSort` → deben usar la
     primitiva de tabla o estar en la whitelist;
     (c) tablas ordenables → deben exponer `aria-sort`.
   - Extender el a11y e2e (`e2e/a11y.spec.ts`) con la tabla de reportes.

## Archivos a tocar

| Archivo                                                                               | Cambio                                                                                |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `frontend/package.json`                                                               | `@tanstack/react-form`, `@tanstack/react-table`, `@tanstack/form-resolvers` (runtime) |
| `frontend/src/hooks/useAppForm.ts`                                                    | **nuevo** — wrapper de TanStack Form + Zod                                            |
| `frontend/src/utils/errorMessages.ts`                                                 | **nuevo** — mensajes de error centralizados en español                                |
| `frontend/src/schemas/forms/*.ts`                                                     | **nuevo** — schemas Zod de entrada de usuario                                         |
| `frontend/src/schemas/index.ts`                                                       | **nuevo** — índice + re-export                                                        |
| `frontend/src/components/ui/DataTable.tsx`                                            | **nuevo** — primitiva headless sobre TanStack Table                                   |
| `frontend/src/components/ui/DataTableHeader.tsx`, `DataTableRow.tsx`                  | **nuevos**                                                                            |
| `frontend/src/hooks/useReportTable.ts`                                                | **nuevo** — estado de sort/paginación                                                 |
| `frontend/src/utils/reportSubtotals.ts`                                               | **nuevo** — función pura de subtotales (extraída del componente)                      |
| `frontend/src/components/ui/ReportTable.tsx`                                          | reescribir sobre la primitiva (549 → objetivo ≤ 250)                                  |
| `frontend/src/components/ui/SortableHeader.tsx`, `PaginationControls.tsx`             | integrar en la primitiva                                                              |
| `frontend/src/components/ui/{Input,Select,Textarea,Checkbox,Switch}.tsx`              | props de error (`aria-invalid`, `aria-describedby`) uniformes                         |
| `frontend/src/hooks/useShiftPatternForm.ts`, `useShiftAssignmentForm.ts`              | migrar a `useAppForm` (450 y 233 líneas)                                              |
| `frontend/src/features/*/components/{*Form,*Modal}.tsx` (18)                          | migrar a `useAppForm` + schema                                                        |
| `frontend/src/features/time-control/components/TimeRecordRow.tsx`                     | evaluar migración a la primitiva de tabla                                             |
| `frontend/src/features/governance/components/{AuditLogFilterPanel,AuditLogsView}.tsx` | evaluar migración                                                                     |
| `frontend/src/tests/guardrails/formTableGuardrails.test.ts`                           | **nuevo**                                                                             |
| `frontend/package.json`                                                               | registrar el guardrail en `test:guardrails` y `lint:guardrails`                       |
| `frontend/src/tests/contracts/form-backend-parity.test.ts`                            | **nuevo**                                                                             |
| `frontend/src/tests/forms/*.test.ts`                                                  | **nuevos**                                                                            |
| `frontend/src/tests/tables/*.test.ts`                                                 | **nuevos**                                                                            |
| `frontend/e2e/a11y.spec.ts`                                                           | extender con la tabla de reportes                                                     |
| `.agents/rules/design-system-governance.md`                                           | sección "Formularios y tablas"                                                        |
| `.agents/rules/frontend-performance.md`                                               | invariante 5 ampliada                                                                 |
| `docs/adr/0025-frontend-form-table-primitives.md`                                     | decisión permanente                                                                   |

## Contratos afectados

- **Backend / `swagger.json` / SDK: ninguno.** Los schemas de formulario se
  **derivan** de las reglas del backend, pero el contrato HTTP no cambia: el
  payload enviado es idéntico al de hoy.
- **Contrato de los componentes de `components/ui/`**: `Input`, `Select`,
  `Textarea`, `Checkbox` y `Switch` aceptan props **adicionales** de error
  (`aria-invalid`, `aria-describedby`, `errorMessage`). Las props existentes
  no cambian → **compatible**; los 40+ consumidores actuales siguen
  funcionando.
- **`ReportTable` es un archivo certificado**
  (`frontend/design-system-certified.json`): si se renombra o se mueve, hay
  que actualizar ese JSON **en el mismo PR** (invariante de ADR-0020 §7), y
  la paridad con `frontend/scripts/audit-design-system.cjs` se verifica.
- **E2E**: los `data-testid` no se renombran; los flujos de formulario
  (empleado, reporte de turno, SMTP, contraseña, MFA) son el contrato de
  regresión.
- **Bundle**: TanStack Form (~5 kB) y TanStack Table (~12 kB) entran al
  bundle de producción. Se mitiga con `manualChunks` si el budget de bundle
  lo exige (el chunk `vendor` actual es de 70 kB gzip 23 kB).

## Riesgos y rollback

| Riesgo                                                               | Mitigación                                                                                                       | Rollback                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| El payload enviado al backend cambia por la normalización de valores | los tests de paridad de la Fase B comparan el payload **exacto** que se envía hoy vs el nuevo                    | revertir la migración de ese formulario      |
| La validación del frontend **rechaza** algo que el backend aceptaba  | la paridad se testea **antes** de migrar cada formulario; el schema parte de las reglas del backend, no al revés | relajar el schema con justificación en el PR |
| Un mensaje de error nuevo cambia el tono del producto                | mapa central `errorMessages.ts` revisado en el PR; el copy se somete al mismo criterio que el resto de la UI     | ajustar el mapa                              |
| `ReportTable` es certificado y su reescritura es grande              | migración en 3 PR (primitiva → hook de subtotales → migración), con el golden test de subtotales como red        | revertir a la versión previa                 |
| La tabla cambia de aspecto al migrar                                 | la regresión visual de la spec 035 (si ya está) sirve de golden; si no, se compara manualmente en claro y oscuro | ajustar estilos en la primitiva              |
| Los 18 formularios migrados a la vez rompen algo                     | 5 PR por feature, e2e en verde en cada uno                                                                       | revertir el feature                          |
| TanStack Form/Table aumentan el bundle                               | medir el bundle antes/después; `manualChunks` si procede                                                         | revertir la migración                        |
| `useShiftPatternForm` (450 líneas) es un caso extremo                | se migra **primero** (Fase C-1) para descubrir los problemas del patrón antes de aplicarlo a 17 más              | ajustar el wrapper `useAppForm`              |

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
