# Tareas 031: UI/UX Consolidation

Spec: `./spec.md`. Plan: `./plan.md`. Las tareas de estado remoto viven en
`../032-remote-state-consolidation/tasks.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## Fase A — Accesibilidad de modales y lint

- [x] T1: Añadir `eslint-plugin-jsx-a11y` (devDep) a `frontend/eslint.config.js`,
      subset core; corregir las violaciones que revela hasta lint verde con
      budget 0/0 (AC1).
- [x] T2: Test failing primero en
      `frontend/src/tests/components/CinematicModalCoverage.spec.tsx` que
      verifique Escape/focus-trap/`aria-modal` para los 5 modales feature
      (KpiDetailsModal, SingleMeterInputModal, ReportsTab, AuditLogDetailDrawer,
      ForceChangePasswordModal) (AC2).
- [x] T3: Migrar los 5 modales feature a CinematicModal hasta el test de T2 en
      verde; anotar `aria-label` en close icon-only (AC2).
- [x] T4: Nuevo guardrail `frontend/src/tests/guardrails/modalGuardrails.test.ts`
      que bloquea overlays `fixed inset-0` en `src/features` y
      `src/components/ui` sin CinematicModal, con **whitelist gobernada por
      budget monotónico decreciente** (29 = 11 features + 18 ui, conteo real
      medido; crecer falla el CI, reducir no exige tocar el test) y test de
      honestidad que obliga a retirar entradas obsoletas (AC2).

## Fase B — Tokens de dominio y ratchet completo

- [x] T5: Añadir en `frontend/src/index.css` los tokens `--status-*` del dominio
      de jornada (laborando, colación, ausente, vacaciones, permiso especial,
      anomalía, sin marcaje, completado) y `--chart-1..8`, con variantes light/
      dark y contraste AA verificado en claro/oscuro (AC4).
- [x] T6: Migrar `frontend/src/utils/mappings.ts` a clases `token-status-*`
      nuevas conservando la API `Record<K, { label, bg, text }>`; actualizar
      `RoleBadge.tsx`/`IconBox.tsx` a tokens (AC4).
- [x] T7: Extender `audit-design-system.cjs` a la detección del palette crudo en
      todos los prefijos; correr `npm run audit:design-system -- --update` para
      fijar el budget inicial real y confirmar que el ratchet es monotónico (AC3).
- [x] T8: Extender `designSystemGuardrails.test.ts` para que el budget cobre
      palette crudo completo y documentar en el ADR la política de decremento
      (AC3, AC13).

## Fase C — Deduplicación y limpieza

- [x] T9: PR 1 — borrar `SupervisorReusableComponents.tsx`,
      `SupervisorAdvancedComponents.tsx`, barrel `supervisor-dashboard/components/index.ts`,
      `SupervisorDashboardExample.tsx`, `contexts/SessionTimeoutContext.tsx` y
      `components/ui/CardHeader.tsx`; **actualizar la lista de archivos
      certificados de `designSystemGuardrails.test.ts` (línea 172) en el mismo
      PR**; `npm run check` verde sin referencias (AC5).
- [ ] T10: Fusionar `CloseIcon`/`XMarkIcon` en un solo archivo y actualizar el
      barrel `icons/index.ts`; grep que no queden glifos duplicados (AC6).
- [ ] T11: PR 2 — extender `DatePickerDialog` a modo componible (`value/onChange`,
      `weekStartsOn: 1`, nav accesible por teclado), borrar `GlassDatePicker`,
      migrar `ExportLogsModal`, evaluar el reemplazo de inputs nativos date (AC7).
- [ ] T12: PR 3 — TabNav APG (`role="tablist"/tab/aria-selected` + flechas) y
      migrar las copias de GovernanceHub/Configuration (AC7).
- [ ] T13: Unificar KpiCard/MetricCard en una primitiva tipada (variantes de
      color en union type, sin parsing runtime), migrar ~11 usos (AC9).
- [ ] T14: Unificar spinners sobre `LoadingSpinner` (variantes `sm|md|lg`);
      borrar overlays/spinners duplicados y migrar los 54 usos crudos
      (`animate-spin` inline permitido solo dentro de Button loading) (AC9).
- [ ] T15: PR 4 — trasladar ~24 modales de dominio de `components/ui/` a
      `features/<dominio>/components/` con imports/whitelist actualizados;
      `components/ui/` queda solo con primitivas + shell utils; los migrados
      se re-auditan contra el estándar de AC2 (AC8, AC2).

## Fase D — Tipografía, catálogo y z-scale

- [ ] T16: Eliminar `text-[7px|8px|9px]` con `typo-ui-badge`/`typo-ui-caption`/
      `text-xxs`; adoptar `typo-ui-*` en shell (Header, Sidebar, badges);
      añadir al guardrail el budget monotónico para `text-[10px]`/`text-[11px]`
      restantes (AC10).
- [ ] T17: Definir escala z con nombres unificados en `frontend/src/constants/`:
      `Z.base|sticky|dropdown|overlay|modal|max|toast`; reemplazar mágicos
      (`z-60`, `z-100`, `z-9999`); guardrail z-scale (AC11).
- [ ] T18: Publicar showcase como ruta `/design-system` (lazy, gating
      Administrador), link desde Sidebar + DeveloperPanel y documentación por
      primitiva (variantes/estados/uso) (AC12).

## Verificación final

- [ ] T19: Extender `frontend/e2e/a11y.spec.ts` con axe core/serious en dashboard,
      planificador y worker-portal (claro+oscuro) (AC13).
- [ ] T20: Correr suite completa: `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run audit:design-system`, `npm run e2e:staging`,
      `npm run spec:check`, `npm run docs:check`, `npm run preflight` (AC13).
- Nota: la promoción de ADR-0022 a "Aceptado" vive como T10 en
  [032-remote-state-consolidation](file:///specs/032-remote-state-consolidation/tasks.md),
  para que el cierre de 031 no dependa de la consolidación de estado remoto.
