# Plan 031: UI/UX Consolidation

Spec: `./spec.md`. Constitución: `../constitution.md`.
Hermano de baja superficie de estado: `../032-remote-state-consolidation/plan.md`.

## Estrategia

4 workstreams secuenciales (A→D) + uno extraíble (estado remoto, spec 032). Cada
fase termina en estado verde (`validate:ci` + guardrails) para poder pausar sin
dejar a medio camino.

1. **Fase A — Accesibilidad de modales (quick win, 1 PR)**:
   - Añadir `eslint-plugin-jsx-a11y` a `eslint.config.js` (plugin de dev, reglas
     core recomendadas, sin warnings chillones: `strict` solo para modales).
   - Envolver en CinematicModal los 5 modales feature detectados
     (KpiDetailsModal, SingleMeterInputModal, ReportsTab, AuditLogDetailDrawer,
     ForceChangePasswordModal) y añadir `aria-label` explícito en los botones
     icon-only de cierre donde el `title` no baste.
   - Guardrail nuevo: el test falla si un `.tsx` de feature contiene
     `fixed inset-0` sin importar CinematicModal y sin estar en whitelist
     (`frontend/src/tests/guardrails/modalGuardrails.test.ts`). La whitelist se
     modela como **budget monotónico decreciente** (constante exportada +
     aserción de longitud ≤ valor registrado): institucionaliza los ~28 modales
     hand-rolled restantes pero fuerza que cada PR que toque uno lo reduzca.
   - Escribir primero los tests failing (TDD) contra CinematicModal ya probado
     (ver `CinematicModal.spec.tsx` como patrón de referencia).
2. **Fase B — Tokens de dominio + ratchet completo**:
   - Añadir en `@theme`/`:root`/`.dark` de `index.css` los tokens de estado del
     dominio y la paleta de datos (`--status-laborando`, `--status-colacion`,
     `--status-ausente`, `--status-completado`, ... y `--chart-1..8`),
     manteniendo contraste AA en claro/oscuro (los estados ya definidos no se
     tocan, solo se agregan).
   - Migrar `src/utils/mappings.ts` (y `RoleBadge.tsx`, `IconBox.tsx`) a las
     clases `token-status-*` nuevas; las clases `*CONFIG` conservan su API
     (`Record<K, { label, bg, text }>`), lo que minimiza el diff en consumidores.
   - Extender `audit-design-system.cjs` con la detección de palette crudo en
     todos los prefijos; inicializar `design-system-budget.json` al conteo real
     y documentar la política de decremento monotónico en el ADR.
   - El conteo inicial esperado es ~1.143; si el conteo real difiere, el budget
     se fija con `npm run audit:design-system -- --update`.
   - **Verificado en T7**: el conteo real con el conjunto de prefijos del ratchet
     es **977** usos de palette crudo (`paletteIssuesBudget`) y **189** dentro
     de archivos certificados (`certifiedPaletteBudget`); el scope estricto
     slate/gray permanece en 0.
3. **Fase C — Deduplicación y limpieza (4 PR)**:
   - PR 1: borrar código muerto (SupervisorReusable/AdvancedComponents, barrel
     `supervisor-dashboard/components/index.ts`, `SessionTimeoutContext`,
     `SupervisorDashboardExample`, `CardHeader`) + **actualizar la lista de
     archivos certificados de `designSystemGuardrails.test.ts`** (CardHeader en
     línea 172) y fusionar `CloseIcon`/`XMarkIcon` en el barrel de iconos.
   - PR 2: date picker único — extender `DatePickerDialog` con modo
     componible (`weekStartsOn: 1` + nav con aria-label + teclado APG), borrar
     `GlassDatePicker` y migrar `ExportLogsModal`.
   - PR 3: TabNav con `role="tablist"` / `role="tab"` + `aria-selected` +
     navegación por flechas; unificar la tarjeta de métrica (KpiCard como base;
     MetricCard muere con usuarios migrados a variantes tipadas); spinner único
     (`LoadingSpinner` variantes `sm|md|lg`).
   - PR 4: traslado de modales de dominio desde `components/ui/` a
     `features/<dominio>/components/` (import paths + guardrails whitelist) y
     re-auditoría de que los migrados cumplen el estándar de modal de AC2.
4. **Fase D — Tipografía, catálogo y z-scale**:
   - Reemplazar `text-[7px..9px]` por `typo-ui-badge`/`typo-ui-caption`/`text-xxs`
     y adoptar `typo-ui-*` en shell (Header, Sidebar, TabNav, badges);
     budget monotónico para `text-[10px|11px]` remanentes vía
     `designSystemGuardrails`.
   - Escala z-index como constantes en
     [constants](../../frontend/src/constants) con la factada final:
     `Z.base|sticky|dropdown|overlay|modal|max|toast` + guardrail que bloquee
     `z-[9999]`/niveles fuera de la escala.
   - Ruta `/design-system` (lazy, solo Administrador) que sirva el showcase como
     página completa; DeveloperPanel reusa el mismo componente.

## Archivos a tocar

| Archivo | Cambio |
| ------- | ------ |
| `frontend/eslint.config.js` | añadir `eslint-plugin-jsx-a11y` (dev) |
| `frontend/package.json` | `eslint-plugin-jsx-a11y` + `@testing-library/dom` (devDep; peer explícito de RTL v16) |
| `frontend/src/index.css` | tokens `status-*` dominio + `chart-1..8` |
| `frontend/src/utils/mappings.ts` | migrar CONFIG block a clases token |
| `frontend/scripts/audit-design-system.cjs` | regex palette completa |
| `frontend/design-system-budget.json` | budget inicial real + ratchet |
| `frontend/src/components/ui/CinematicModal.tsx` | (referencia) sin cambios |
| `frontend/src/features/{supervisor,meters,governance,auth}/...` | modales → CinematicModal |
| `frontend/src/tests/guardrails/modalGuardrails.test.ts` | nuevo guardrail + whitelist-budget |
| `frontend/src/tests/guardrails/designSystemGuardrails.test.ts` | certified list (CardHeader), texto y z-scale |
| `frontend/src/components/ui/{GlassDatePicker,MetricCard,TabNav}.tsx` | unificar/borrar |
| `frontend/src/features/supervisor-dashboard/components/Supervisor*` | borrar (muerto) |
| `frontend/src/components/ui/*.tsx` (~24) | trasladar a `features/<dominio>/components/` |
| `frontend/src/components/ui/icons/*` | dedup CloseIcon/XMarkIcon |
| `docs/adr/0022-ui-ux-consolidation.md` | decisión permanente |

## Contratos afectados

- **Backend / `swagger.json` / SDK: ninguno** — el spec es de frontend puro. No
  hay rutas, schemas ni regeneración `npm run check:sdk`.
- **PWA/Workbox**: el manifest de precache no cambia; el lazy-load ya existente
  cubre la nueva ruta del catálogo.
- **Ruta nueva del app**: `/design-system` (lazy, gating Administrador) —
  suma una entrada al gate de roles sin tocar backend (rol ya en JWT).

## Riesgos y rollback

| Riesgo | Mitigación | Rollback |
| ------ | ---------- | -------- |
| Budgets iniciales mal calibrados (bloquean CI inmediatamente) | `--update` con conteo verificado en PR separado antes de cambiar regex | revertir budget |
| Migración de modales rompe rutas de imports/barrels | mover+actualizar en el mismo commit; tsc como red | revertir commit por-feature |
| Purgar text-[10px|11px] rompe estándares de densidad industrial | sólo 7-9px se eliminan; 10/11px van a budget monotónico, no hard ban | ajustar budget |
| A11y plugin genera ruido en codebase legacy | activar en modo `recommended` subset, sin warnings en budget 0/0; reglas experimentales off | subset aún más pequeño de reglas |
| Plugin declara peer `eslint ^3..^9` bajo eslint@10 | instalar vía `--legacy-peer-deps` CLI (una vez, sin `.npmrc` committeado — un flag global elimina peers marcados en `npm ci`) y auditar lockfile con 0 bumps/0 removals | quitar el devDep y la config para volver al estado sin plugin |
| Borrar CardHeader rompe el guardrail de archivos certificados | actualizar `designSystemGuardrails.test.ts` en el mismo PR de borrado (T9) | re-listado del archivo |
| Traslado de ~24 modales desordena la whitelist del guardrail de overlays | whitelist se regenera por script en el mismo PR; budget decrece o se mantiene | revertir traslado individual |

## Verificación

```bash
cd frontend
npm run lint                      # AC1 (jsx-a11y)
npm run guardrails                # AC2/AC3/AC5/AC10 via guardrails nuevos+existentes
npm run audit:design-system       # AC3 (palette completo + budget)
npm run test:run -- src/tests/guardrails  # suite guardrails completa
npm run check                     # tipo tras cada PR
npm run validate:ci               # AC13 (front)
npm run e2e:staging               # AC13: gate axe claro/oscuro en rutas extendidas

# Raíz
npm run spec:check                # formato del spec
npm run docs:check                # ADR indexado y links vivos
npm run preflight                 # suite completa
```
