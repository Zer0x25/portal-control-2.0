# Spec 031: UI/UX Consolidation

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-20
- ADR relacionado: [0022-ui-ux-consolidation.md](file:///docs/adr/0022-ui-ux-consolidation.md) (extiende [0020-design-system-governance.md](file:///docs/adr/0020-design-system-governance.md))
- Spec hermano: [specs/032-remote-state-consolidation/spec.md](file:///specs/032-remote-state-consolidation/spec.md)

## Problema

Auditoría UI/UX (2026-10-20, 589 archivos / ~66K líneas) confirma que el sistema
de diseño funciona como gobernanza (tokens, guardrails, showcase), pero presenta
4 huecos estructurales en la capa de superficie UI (el quinto hueco —el doble
sistema de datos y su consolidación de estado remoto— se documenta y ejecuta en
[specs/032](file:///specs/032-remote-state-consolidation/spec.md) por ser el
cambio con mayor riesgo offline):

1. **Blindspot del ratchet de color**: el audit script solo detecta
   `slate|gray|zinc|neutral|stone` + HEX arbitrarios (véase
   [audit-design-system.cjs](file:///frontend/scripts/audit-design-system.cjs):103-107),
   reportando "100% clean" mientras existen **1.143 usos de colores del palette
   Tailwind crudo** (`red/emerald/indigo/amber/sky/...`) en **93 archivos**,
   incluyendo [mappings.ts](file:///frontend/src/utils/mappings.ts) (107) y
   [RoleBadge.tsx](file:///frontend/src/components/ui/RoleBadge.tsx) (40).
   Coexisten 3 familias de tokens: `token-*` (3.384 usos), `sap-*` (413,
   deprecada por ADR-0020 pero viva) y palette crudo (1.143).
2. **~33 modales hand-rolled sin garantías de accesibilidad**: duplican el shell
   de CinematicModal (Escape, focus trap, `aria-modal`, retorno de foco) sin
   heredarlo. En features: 0 focus traps y solo 1 de 6 `role="dialog"` maneja
   Escape (los modales sin garantías:
   [KpiDetailsModal.tsx](file:///frontend/src/features/supervisor-dashboard/components/KpiDetailsModal.tsx):103-125,
   [SingleMeterInputModal.view.tsx](file:///frontend/src/features/meters/components/SingleMeterInputModal.view.tsx):106-111
   — con `role="dialog"` sin `aria-modal` —,
   [ReportsTab.tsx](file:///frontend/src/features/supervisor-dashboard/components/ReportsTab.tsx),
   [AuditLogDetailDrawer.tsx](file:///frontend/src/features/governance/components/AuditLogDetailDrawer.tsx),
   [ForceChangePasswordModal.view.tsx](file:///frontend/src/features/auth/components/ForceChangePasswordModal.view.tsx)).
   Sin un mecanismo de decremento, la whitelist de excepciones del guardrail
   congelaría los ~28 modales hand-rolled restantes para siempre.
3. **Duplicación y código muerto**: 2 date pickers + inputs nativos (3 mecanismos
   de fecha, con `GlassDatePicker.tsx` (eliminado en T11) teclado-inaccesible y
   con 1 solo consumidor), 2 tab systems
   ([TabNav.tsx](file:///frontend/src/components/ui/TabNav.tsx) sin semántica
   `role="tablist"` vs copias pegadas en
   [GovernanceHub.view.tsx](file:///frontend/src/features/governance/views/GovernanceHub.view.tsx):62-84
   y [Configuration.view.tsx](file:///frontend/src/features/configuration/views/Configuration.view.tsx):57-80),
   2 tarjetas de métrica (KpiCard/MetricCard), 54 spinners crudos, 83 iconos
   manuales con un duplicado exacto (`CloseIcon` ≡ `XMarkIcon`, fusionados en
   T10), y ~1.160 líneas de UI muerta (`SupervisorReusableComponents.tsx` +
   `SupervisorAdvancedComponents.tsx`, eliminados en T9, solo consumidos por un
   barrel que nadie importa) más `SessionTimeoutContext.tsx` (eliminado en T9)
   que nunca se monta y `CardHeader.tsx` (eliminado en T9) con 0 usos
   (referenciado además como archivo certificado en
   [designSystemGuardrails.test.ts](file:///frontend/src/tests/guardrails/designSystemGuardrails.test.ts),
   hoy la lista vive en `design-system-certified.json` como fuente única).
4. **Jerarquía tipográfica y catalogación ausente**: ~940 tamaños arbitrarios
   `text-[Npx]` (482× `text-[10px]`, 154× `text-[9px]`, 27× `text-[8px]`) contra
   solo 20 usos de las utilidades oficiales `typo-ui-*`; el catálogo
   [DesignSystemShowcaseModal.tsx`features/design-system/` (ruta `/design-system`)
   solo es accesible por Administrador en modo dev (~24 modales de dominio viven
   además en `components/ui/`, contaminando la capa canónica); no hay plugin de
   accesibilidad en el lint.

## Alcance

Dentro (workstream A–D):

- **A. Accesibilidad de modales y lint**: `eslint-plugin-jsx-a11y` en
  [eslint.config.js](file:///frontend/eslint.config.js); migración de los modales
  feature a CinematicModal (Escape + focus trap + `aria-modal`); guardrail que
  impida overlays `fixed inset-0` sin usar CinematicModal, con whitelist
  gobernada por budget monotónico (solo puede decrecer).
- **B. Tokens de dominio y ratchet completo**: tokens `status-*` extendidos en
  [index.css](file:///frontend/src/index.css) (estados del dominio de jornada +
  paleta `chart-1..N` para data-viz); migración de
  [mappings.ts](file:///frontend/src/utils/mappings.ts) a esos tokens; extensión
  del audit script al palette completo con budget monotónico.
- **C. Deduplicación de primitivas y limpieza**: único date picker componible
  (teclado, `weekStartsOn: 1`), único TabNav con APG, única tarjeta de métrica,
  único sistema de spinner, iconos en barrel tree-shakeable sin duplicados;
  eliminación de código muerto (Supervisor*, SessionTimeoutContext, CardHeader);
  traslado de ~24 modales de dominio desde `components/ui/` hacia sus features.
- **D. Tipografía, catálogo y z-scale**: adopción de `typo-ui-*` y eliminación de
  text-[7px..9px]; escala z-index documentada y unificada con nombres
  (`base`, `sticky`, `dropdown`, `overlay`, `modal`, `max`, `toast`); catálogo
  del design system disponible como ruta navegable del app (no solo panel dev).

Fuera (explícito):

- **Consolidación del estado remoto** (persistencia de TanStack Query en
  IndexedDB, migración de slices, eliminación del refresh doble): migrada al
  spec [032-remote-state-consolidation](file:///specs/032-remote-state-consolidation/spec.md)
  por ser un cambio de arquitectura de datos con riesgo offline, nunca bloquea
  las fases de superficie A/B/C/D.
- Reescritura masiva de vistas para adoptar el catálogo completo (se apoya en
  guardrails, como preconizó ADR-0020).
- Adopción de frameworks de componentes externos (Radix/shadcn/MUI) — descartada
  por ADR-0020; las garantías de a11y se implementan en primitivas propias.
- Migración de backend, rutas HTTP o esquemas Prisma (spec de frontend puro;
  `swagger.json` y SDK no cambian).

## Criterios de aceptación

- [ ] AC1: `eslint-plugin-jsx-a11y` está activo en `eslint.config.js`, `npm run lint`
      en verde con el presupuesto lint-budget intacto (0/0), y las reglas core
      (`alt-text`, `no-noninteractive-tabindex`, `interactive-supports-focus`)
      bloquean violaciones nuevas.
- [ ] AC2: Los 5 modales feature listados en Problema.2 y los modales de dominio
      reubicados usan CinematicModal o registran Escape + focus trap + `aria-modal`
      propios; el guardrail de overlays (`fixed inset-0` fuera de CinematicModal)
      escanea `src/features` y `src/components/ui` y mantiene una whitelist
      explícita gobernada por **budget monotónico decreciente** inicializada al
      conteo real de overlays hand-rolled restantes (29 verificados: 11 en
      features + 18 en `components/ui`; la estimación inicial de ~28 se ajustó
      al medir el código): crecer el budget falla el CI; reducirlo nunca exige
      ediciones del test. Un test en [src/tests/components](file:///frontend/src/tests/components)
      verifica Escape, wrap del Tab y retorno de foco en los modales migrados.
- [ ] AC3: El audit script detecta el palette crudo completo (prefijos
      `bg|text|border|ring|divide|from|via|to|fill|stroke|decoration|shadow` con
      tono numérico) y
      [design-system-budget.json](file:///frontend/design-system-budget.json)
      se inicializa al conteo real verificado; el ratchet solo decrece y el CI
      falla ante incrementos.
- [ ] AC4: `src/utils/mappings.ts` y los consumidores de estados de jornada usan
      únicamente clases `status-*`/`chart-*` semánticas definidas en `@theme`
      (con variantes light/dark), sin clases de palette crudo ni HEX.
- [ ] AC5: El código muerto está eliminado (~1.160 líneas Supervisor*,
      SessionTimeoutContext, CardHeader, `index.ts` de barrels sin consumidores),
      **incluyendo la actualización de la lista de archivos certificados de
      [designSystemGuardrails.test.ts](file:///frontend/src/tests/guardrails/designSystemGuardrails.test.ts):172**
      que referencia CardHeader, y `npm run check` en verde sin referencias
      huérfanas.
- [ ] AC6: `CloseIcon`/`XMarkIcon` quedan fusionados en un solo icono (barrel
      de [icons](file:///frontend/src/components/ui/icons) sin duplicados) y el
      audit de iconos no detecta glifos repetidos.
- [ ] AC7: Existe un único date picker componible (accesible por teclado,
      `weekStartsOn: 1`, labels de navegación con aria-label), un único TabNav
      con `role="tablist"/"tab"` + `aria-selected` + navegación por flechas, y un
      único componente de spinner; GlassDatePicker y las copias de tabs de
      GovernanceHub/Configuration se eliminan.
- [ ] AC8: `src/components/ui/` contiene solo primitivas transversales, metas y
      utilidades shell; los ~24 modales de dominio viven en su feature
      (`features/<dominio>/components/`) con imports actualizados y los guardrails
      referencian las rutas nuevas (los modales migrados quedan sujetos a AC2).
- [ ] AC9: KpiCard/MetricCard quedan unificados en una sola primitiva tipada
      (variantes de color válidas por tipo, sin parsing de strings en runtime) y
      los componentes de carga (`LoadingSpinner`, `LoadingOverlay`,
      `BackgroundActivitySpinner`, spinner inline de Button) comparten una única
      implementación (class `animate-spin` estándar + variantes de tamaño).
- [ ] AC10: La jerarquía tipográfica usa `typo-ui-*` (o títulos de `text-*` del
      estándar) en el shell y las vistas core, con 0 usos de `text-[7px]`,
      `text-[8px]`, `text-[9px]` y un budget monotónico para
      `text-[10px]`/`text-[11px]` remanentes.
- [ ] AC11: Existe una escala z-index documentada como constantes/tokens con
      nombres unificados (`base`, `sticky`, `dropdown`, `overlay`, `modal`,
      `max`, `toast`), sin `z-[9999]`, `z-60`/`z-100`/`z-9999` ni números
      mágicos fuera de la escala (`z-10..z-50` para stacking de contenido se
      mapean a `base`/`sticky`).
- [ ] AC12: El catálogo (DesignSystemShowcase evolucionado) es alcanzable como
      ruta navegable del app (link desde DeveloperPanel y Sidebar para
      Administrador) y documenta por primitiva: variantes, estados, tamaño y
      expectativas de uso.
- [ ] AC13: `npm run validate:ci` (frontend), `npm run guardrails`,
      `npm run audit:design-system`, `npm run spec:check`, `npm run docs:check` y
      `npm run preflight` en verde; la suite axe e2e
      [e2e/a11y.spec.ts](file:///frontend/e2e/a11y.spec.ts) cubre además las rutas
      top tras la consolidación (dashboard, planificador, worker-portal) en claro
      y oscuro sin violaciones critical/serious.

## Restricciones

- Constitución (I–V): Spec antes que PR; revisión con guardrails; calidad
  acumulativa monotónica (budgets solo decrecen). Ver
  [constitution.md](file:///specs/constitution.md).
- Respeto irrestricto de [frontend-performance.md](file:///.agents/rules/frontend-performance.md):
  sin `framer-motion` en átomos, micro-animaciones por clases CSS GPU, CSS
  emitido como asset con hash, `dist/index.html` ≤ 5 KB.
- Sin dependencias runtime pesadas nuevas: la accesibilidad se implementa en
  primitivas propias (CinematicModal/APG); eslint-plugin-jsx-a11y es dep de dev
  y ninguna otra lib nueva entra en runtime.
- La adopción de tokens es progresiva: los budgets del ratchet (palette crudo,
  whitelist de modales, text-px) se fijan al conteo real inicial (no 0) para que
  el CI valide mejora monotónica, no perfección inmediata. Ver ADR-0020 como
  antecedente de esta política en [lint-budget.json](file:///lint-budget.json).
- [AGENTS.md](file:///AGENTS.md) permanece ≤ 120 líneas / ≤ 8 KB; la guía
  detallada de este spec vive en `.agents/rules/design-system-governance.md`
  (si se amplía) y en este spec.

## Trazabilidad

- Tests que lo probarán:
  [src/tests/guardrails/designSystemGuardrails.test.ts](file:///frontend/src/tests/guardrails/designSystemGuardrails.test.ts)
  (AC3, AC4, AC5, AC10), nuevo guardrail de modales con whitelist-budget
  (AC2, AC8), specs de primitivas (AC2, AC7, AC9),
  [e2e/a11y.spec.ts](file:///frontend/e2e/a11y.spec.ts) extendido (AC13),
  [scripts/audit-design-system.cjs](file:///frontend/scripts/audit-design-system.cjs)
  (AC3).
- Docs a actualizar: [docs/adr/0022-ui-ux-consolidation.md](file:///docs/adr/0022-ui-ux-consolidation.md),
  [docs/adr/README.md](file:///docs/adr/README.md),
  [.agents/rules/design-system-governance.md](file:///.agents/rules/design-system-governance.md),
  [frontend/src/features/README.md](file:///frontend/src/features/README.md).
