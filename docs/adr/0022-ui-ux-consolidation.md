# ADR-0022: UI/UX Consolidation — Tokens de dominio, Ratchet completo y Estado remoto único

- Estado: Propuesto
- Fecha: 2026-10-20
- Autores: zer0x

## Contexto

La auditoría UI/UX del 2026-10-20 (589 archivos, ~66K líneas) confirma que la
gobernanza de ADR-0020 dejó de operar en sus zonas no blindadas:

1. **Blindspot del ratchet de color**: `frontend/scripts/audit-design-system.cjs:103-107`
   solo detecta `slate|gray|zinc|neutral|stone` + HEX arbitrarios y reporta
   "100% clean" (budget 0/0), mientras existen 1.143 usos de palette crudo
   (`red|emerald|indigo|amber|sky|...`) en 93 archivos — concentrados en
   `frontend/src/utils/mappings.ts:20-120` (107), donde los estados reales del
   dominio de jornada (Laborando, En Colación, Ausente, Vacaciones, ...) no
   tienen tokens: el sistema solo define 4 estados (`--status-success/error/
warning/info`), por lo que la excepción se convirtió en regla de facto.
2. **Doble sistema de datos**: 7 slices de Zustand (`store/slices/absenceSlice.ts`,
   `shiftSlice.ts`, `meterReadingSlice.ts`, `employeeSlice.ts`, `userSlice.ts`,
   `configSlice.ts`, `dashboardSlice.ts`) importan servicios, escriben IndexedDB
   y duplican colecciones que TanStack Query ya posee; cada mutación refresca
   por dos vías (`frontend/src/hooks/useShiftMutations.ts:17-43` ejecuta
   `invalidateQueries` **y** `loadShiftData()`), violando la invariante 4
   de `.agents/rules/frontend-performance.md`. La cola de escritura offline
   (`syncSlice.ts`) y la sesión (`authSlice.ts`) también importan servicios,
   pero no duplican colecciones: son estado de proceso legítimo y quedan fuera
   de la unificación (excepciones explícitas del guardrail de frontera).
3. **Accesibilidad dibujada a mano**: 33 modales hand-rolled duplican el shell
   de `CinematicModal.tsx` sin heredar Escape/focus trap/`aria-modal`/retorno de
   foco (0 focus traps en `features/`); no existe `eslint-plugin-jsx-a11y`.
4. **Primitivas duplicadas y código muerto**: 3 mecanismos de picker de fecha
   (DatePickerDialog, GlassDatePicker — inaccesible por teclado, 1 consumidor —,
   inputs nativos), 2 tab systems sin semántica APG, 2 tarjetas de métrica, 54
   spinners crudos, ~1.160 líneas de UI muerta (`SupervisorReusableComponents.tsx`,
   `SupervisorAdvancedComponents.tsx`), `SessionTimeoutContext.tsx` nunca montado,
   `CardHeader.tsx` con 0 usos.
5. **Tipografía inconsistentemente escalada**: ~940 `text-[Npx]` arbitrarios
   (incluyendo 7px/8px/9px) frente a 20 usos del sistema `typo-ui-*`.

## Decisión

1. **Tokens de dominio explícitos**: extender `@theme` en
   `frontend/src/index.css` con `--status-*` para los estados del dominio de
   jornada/planning y una paleta `--chart-1..8` de data-viz, con variantes
   light/dark y contraste AA. La clase semántica `token-status-*` es la única
   vía legal de colorear estados; las clases de palette crudo quedan excluidas
   de `src/utils/mappings.ts` y componentes de estado.
2. **Ratchet sin blindspots**: `audit-design-system.cjs` y
   `frontend/design-system-budget.json` pasan a detectar palette crudo en todos
   los prefijos de Tailwind (`bg|text|border|ring|divide|from|via|to|fill|stroke|
decoration|shadow`). El budget inicial se fija al conteo real verificado y es
   monotónico decreciente: cada PR solo puede reducirlo. Perfección no instantánea,
   regresión prohibida (igual política que `lint-budget.json`).

   **Política de decremento (aplicable a todos los ratchets de este ADR)**:
   - Cada budget se inicializa al **conteo real medido** (nunca 0 si hay deuda),
     de modo que el ratchet sea aplicable desde el primer día y el CI falle ante
     cualquier incremento.
   - `--update` de `audit-design-system.cjs` **solo puede bajar** el budget: si el
     conteo actual supera el vigente, el script aborta con error en vez de
     absorber la regresión.
   - Reducir el drift **nunca exige editar el budget**: el conteo real por debajo
     del budget es un estado válido (y deseado).
   - La lista de archivos certificados vive en
     `frontend/design-system-certified.json` (fuente única compartida por el
     audit script y el guardrail `designSystemGuardrails.test.ts`); al migrar o
     eliminar un archivo certificado se actualiza ese JSON, no una lista
     duplicada.
   - Budgets vigentes al cierre de la Fase B: `totalIssuesBudget` 0 (scope
     estricto slate/gray, cero tolerancia), `paletteIssuesBudget` **977** (palette
     crudo completo) y `certifiedPaletteBudget` **189** (subconjunto certificado).

3. **Estado remoto único con caché seguro**: las colecciones remotas viven
   exclusivamente en TanStack Query con persistencia offline de lectura vía
   `@tanstack/react-query-persist-client` (`PersistQueryClientProvider`) +
   `@tanstack/query-async-storage-persister` (`createAsyncStoragePersister`),
   ambas sobre IndexedDB y ambas dependencias de runtime. Los slices de Zustand
   se reservan para la cola de escritura offline (kiosk/worker-portal) y la
   sesión (auth+session), con whitelist explícita del guardrail de frontera.
   Toda mutación refresca por una única vía (`invalidateQueries`); el patrón
   `invalidate + loadXData()` queda eliminado y bloqueado por guardrail. En
   dispositivos compartidos (kiosk), el caché persistido exige un ciclo de vida
   seguro: purge íntegro al logout/cambio de usuario (incluida expiración de
   sesión), exclusión de queries sensibles vía `dehydrateOptions.
shouldDehydrateQuery` (allowlist de catálogos, nunca blocklist) y `buster`
   por versión de despliegue.
4. **Estándar de modal accesible**: `CinematicModal` es la única implementación
   legal de overlay de modal; todo overlay `fixed inset-0` fuera de su uso o de
   whitelist explícita queda bloqueado por
   `frontend/src/tests/guardrails/modalGuardrails.test.ts`, y la whitelist misma
   queda gobernada por budget monotónico decreciente (los ~28 modales hand-rolled
   remanentes no se congelan: migrarlos reduce el budget y crecerlo falla el CI).
   Las primitivas
   interactivas siguen WAI-ARIA APG (tablist/flechas/tooltips);
   `eslint-plugin-jsx-a11y` es parte del lint requerido.
5. **Un único date picker componible**: la grilla de calendario vive solo en
   `frontend/src/components/ui/DatePicker.tsx` (`DatePickerCalendar` con
   `role="grid"`, navegación por flechas/Home/End/PageUp/PageDown, `weekStartsOn: 1`
   y etiquetas `aria-label` por día) y `DatePickerDialog` la reutiliza en modo
   modal. `GlassDatePicker` queda eliminado y su único consumidor
   (`ExportLogsModal`) migra al control componible `value`/`onChange`. Los
   `input[type="date"]` nativos se **mantienen** en los cuatro paneles de filtro
   (AuditLog, TimeRecord, Kpi, Report): son accesibles por defecto, usan el
   calendario del sistema y evitan el desfase de zona horaria de
   `new Date("YYYY-MM-DD")`; el guardrail `datePickerGuardrails.test.ts` impide
   que aparezcan fuera de esa lista.
6. **Spinner único**: `components/ui/LoadingSpinner.tsx` es la única
   implementación del arco giratorio (variantes `xs|sm|md|lg|xl` y tonos
   `default|onAccent|subtle`, con `role="status"` y nombre accesible).
   `LoadingOverlay`, `InitialSyncOverlay` y `BackgroundActivitySpinner` la
   reutilizan; el único `animate-spin` inline propio es el del estado
   `loading` de `Button`. La rotación de iconos de refresco heredada
   (`ArrowPathIcon`, `SyncStatus`) queda grandfathered con un budget monotónico
   (17 usos) que solo puede decrecer, y el guardrail
   `spinnerGuardrails.test.ts` bloquea cualquier spinner circular nuevo.
7. **Capa UI sin modales de dominio**: `src/components/ui/` queda con
   primitivas transversales, modales de meta/ayuda del shell y utilidades
   (overlays de sesion/sincronizacion). Los modales de dominio viven en
   `features/<dominio>/components/` (15 modales migrados en T15) y las
   primitivas no dependen de features (guardrail `uiLayeringGuardrails.test.ts`).
8. **Escala z-index con nombres**: `src/constants/zScale.ts` define los 7
   niveles `base|sticky|dropdown|overlay|modal|max|toast`; los 129 usos de
   numeros magicos (`z-50`, `z-9999`, `z-100000`, …) pasan a `Z.<nivel>` con
   un mapeo por ranking que conserva el orden relativo de apilado. El guardrail
   `zScaleGuardrails.test.ts` bloquea nuevos `z-<numero>`.
9. **Catálogo navegable del design system**: la ruta `/design-system`
   (lazy, restringida a Administrador) publica el catálogo con documentación por
   primitiva (variantes, estados, uso y notas de accesibilidad) en
   `features/design-system/`. El enlace vive en el Sidebar (solo
   Administrador) y el DeveloperPanel navega a la ruta en vez de abrir un modal.
10. **Catálogo tipado y verificable**: un solo TabNav APG, un solo spinner,
    una sola tarjeta de métrica con variantes tipadas. Los
    modales de dominio viven en `features/<dominio>/components/`; `components/ui/`
    queda reservado a primitivas transversales y utilidades shell.

## Verificacion de cierre (2026-10-20)

- `npm run validate:ci` (frontend): format, lint, lint-budget 0/0, tsc, 470
  tests y build en verde.
- Guardrails: 52/52 (modal, palette, tipografia, z-scale, spinner, tab,
  metric card, date picker, iconos y capa UI).
- Audit de design system: budgets 0 (scope estricto), 879 (palette crudo) y
  173 (certificados); el ratchet solo bajo durante la consolidacion.
- e2e axe-core: 8/8 (login, dashboard, planificador y worker-portal, en tema
  claro y oscuro) contra el build de produccion y el backend real. La
  extension al planificador destapo violaciones preexistentes de contraste y
  de nombre accesible en el calendario de turnos, ya corregidas.
- `npm run spec:check` (32 specs), `npm run docs:check` (206 md, 22 ADR) y
  `npm run preflight` en verde.

## Alternativas consideradas

1. **Radix UI / shadcn/ui para a11y de modals y tabs** — descartada: ADR-0020
   evaluaron ese trade-off y el presupuesto de bundle mandó; las garantías APG
   se replican en primitivas propias ya existentes (CinematicModal tiene trap,
   Escape, retorno y tests).
2. **Fix del palette caso a caso (solo `mappings.ts`)** — descartada: deja vivo
   el blindspot (la excepción rebrota); el ratchet completo es la garantía de
   monotonicidad que ya funciona en `lint-budget.json`.
3. **Mantener el doble sistema de datos con bombas de sincronización manuales** —
   descartada: `persistQueryClient` es el mecanismo oficial de TanStack para
   cache offline; duplicarlo con un cache a mano tiene un costo de
   mantenimiento continuo y un riesgo conocido de inconsistencia (doble refresh).
4. **Ban instantáneo de `text-[10px|11px]` y valores mágicos como `z-9999`** —
   descartada para no romper la densidad de operación industrial; el ban
   inmediato aplica solo a tamaños < 10px, y para 10/11px se usa budget
   monotónico decreciente.

## Consecuencias

Positivas:

- Soporte completo del dominio de jornada dentro del sistema (no excepciones).
  El design system cubre estados/charts reales: se cierra la brecha que producía
  1.143 escapes.
- Ratchet de verdade: drift medible en CI con decaimiento monotónico.
- Una sola vía de datos remotos: offline por cache de queries; mutaciones
  idempotentes de refresco; menos carga al backend (sin doble fetch).
- A11y de modales uniforme: focus trap + Escape + aria-modal garantizados en
  capa única testada.
- Catálogo navegable, primitivas deduplicadas y tipografía escalada reducen el
  costo de cada feature nueva (menos markup ad-hoc).

Negativas / costos aceptados:

- Migración progresiva: el budget inicial (~1.143 palette crudo) es alto; la
  reducción es un esfuerzo multi-sprint por diseño.
- El persister añade dos dependencias de runtime pequeñas
  (`@tanstack/react-query-persist-client`,
  `@tanstack/query-async-storage-persister`) y una política de
  `shouldDehydrateQuery`/`buster`/purge, con rollback trivial (flag).
- Riesgo puntual de regresión offline en PWA durante la consolidación de estado
  (spec 032; mitigado con e2e:staging de worker/kiosk y no tocando la cola de
  escritura).
- El catálogo `/design-system` añade una ruta más al gate de roles (solo
  Administrador).

## Referencias

- `frontend/src/index.css` — tokens `@theme` ampliados con `status-*`/`chart-*`.
- `frontend/src/utils/mappings.ts` — migración a tokens semánticos.
- `frontend/scripts/audit-design-system.cjs` + `frontend/design-system-budget.json`
  — ratchet completo.
- `frontend/design-system-certified.json` — fuente única de archivos certificados
  (audit script + guardrail de tests).
- `frontend/src/contexts/AppProviders.tsx` — `PersistQueryClientProvider` +
  persister seguro (purge, `shouldDehydrateQuery`, `buster`).
- `frontend/src/components/ui/CinematicModal.tsx` + `modalGuardrails.test.ts` —
  estándar de modales.
- Antecedentes: [0020-design-system-governance.md](file:///docs/adr/0020-design-system-governance.md),
  [0021-branding-por-instancia-logo.md](file:///docs/adr/0021-branding-por-instancia-logo.md).
- Specs: [specs/031-ui-ux-consolidation/spec.md](file:///specs/031-ui-ux-consolidation/spec.md)
  (superficie UI: fases A/B/C/D) y
  [specs/032-remote-state-consolidation/spec.md](file:///specs/032-remote-state-consolidation/spec.md)
  (estado remoto + seguridad de caché, extraído por riesgo).
