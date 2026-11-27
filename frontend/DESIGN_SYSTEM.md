# Sistema de Diseño Visual: Proyecto PORTAL

Este documento resume la arquitectura vigente del **Design System** de PORTAL y su relación con los guardrails automáticos. La fuente ejecutable de reglas vive en [`.agents/rules/design-system-governance.md`](../.agents/rules/design-system-governance.md) y la fuente de verdad de tokens en [`tokens.json`](tokens.json).

---

## 1. Principios Visuales

PORTAL es una herramienta operativa de mando y control enfocada en **claridad, precisión industrial y durabilidad visual**:

- **Superficies semánticas automáticas (Claro / Oscuro):** los temas se resuelven mediante custom properties CSS (`:root` y `.dark`) mapeadas en `@theme` dentro de `src/index.css`.
- **Cero colores arbitrarios o legados:** no se permiten clases `sap-*`, HEX arbitrarios (`bg-[#...]`), ni paletas neutras crudas (`slate`/`gray`/`zinc`/`neutral`/`stone`).
- **Rendimiento CSS-first:** micro-animaciones aceleradas por GPU (`animate-in`, `fade-in`, `zoom-in-*`), sin `framer-motion` en primitivas atómicas (`Button`, `Card`, `Badge`, `CinematicModal`, `TabNav`, filas de tabla).

---

## 2. Pipeline de Tokens Semánticos (`tokens.json`)

[`frontend/tokens.json`](tokens.json) define los **71 tokens semánticos** del sistema (valores `light` / `dark` y su `cssVar` subyacente):

- **Superficies:** `bg-token-surface-app`, `bg-token-surface-card`, `bg-token-surface-header`, `bg-token-surface-sidebar`, `bg-token-surface-hover`, `bg-token-surface-active`, `bg-token-surface-stripe`, `bg-token-surface-technical`
- **Bordes:** `border-token-border-technical`, `border-token-border-subtle`, `border-token-border-focus`
- **Textos:** `text-token-text-primary`, `text-token-text-secondary`, `text-token-text-tertiary`, `text-token-text-onAccent`
- **Acento y Sidebar:** `bg-token-accent-brand`, `text-token-accent-brand`, `text-token-sidebar-text-active`, `bg-token-sidebar-item-hover`
- **Estados genéricos:** `token-status-success`, `token-status-warning`, `token-status-error`, `token-status-info` (junto a sus variantes `-surface` y `-text` verificadas por contraste WCAG AA)
- **Estados de dominio (turnos):** `laborando`, `colacion`, `ausente`, `vacaciones`, `permiso-especial`, `licencia-medica`, `anomalia`, `sin-marcaje`, `completado`, `feriado`, `no-programado` (cada uno con color base, `-surface` y `-text`)
- **Data-viz:** `token-chart-1` .. `token-chart-8`

> **Regla:** no editar manualmente las regiones `@tokens:theme` ni `@tokens:vars` en `src/index.css`. Modificar `tokens.json` y ejecutar:
>
> ```bash
> npm run tokens:build
> npm run tokens:check
> ```

---

## 3. Tipografía, Escala Z y Layout

### 3.1. Tipografía (`src/index.css`)

- **Familias:** `Inter` (`font-sans`) para UI general y `Roboto Mono` (`font-mono` + `tabular-nums`) para horas, fechas, folios e indicadores numéricos.
- **Utilidades de UI:** `typo-ui-tab`, `typo-ui-title`, `typo-ui-label`, `typo-ui-badge`, `typo-ui-meta`, `typo-ui-caption` y `text-xxs` (tamaño mínimo permitido: `10px`; prohibido `7px`–`9px`).
- **Utilidades de listas:** `typo-list-header`, `typo-list-primary`, `typo-list-secondary`, `typo-list-value`, `typo-list-note`, `typo-list-status` (sin cursiva decorativa en filas operativas).

### 3.2. Capas Z-Index (`src/constants/zScale.ts`)

Prohibidas las clases numéricas `z-10`, `z-50`, etc. Usar siempre `Z.<nivel>`:

`base` → `sticky` → `dropdown` → `overlay` → `modal` → `max` → `toast`

### 3.3. Contenedores y Pantallas

- Toda vista (`*.view.tsx`) envuelve su contenido raíz en `Container` (`src/components/ui/Container.tsx`).
- Alturas de pantalla completa en shells/layouts usan `min-h-dvh` o `h-dvh` (nunca `100vh` / `h-screen`) y utilidades `pt-safe` / `pb-safe` / `p-safe` para PWA.
- Tolerancia obligatoria hasta `320px` de ancho sin scroll horizontal forzado.

---

## 4. Primitivas Canónicas (`src/components/ui/`)

| Necesidad | Primitiva oficial | Notas clave |
| :--- | :--- | :--- |
| Acciones | `Button.tsx` | Variantes `primary`, `secondary`, `danger`, `ghost`, `none` |
| Campos de formulario | `Input.tsx`, `Select.tsx`, `FilterSelect.tsx`, `Textarea.tsx`, `Checkbox.tsx`, `Switch.tsx` | `id` garantizado vía `useId()`, `aria-invalid` y `aria-describedby` automáticos |
| Desplegables de filtrado | `FilterSelect.tsx` | Único `<select>` del sistema: chevron propio, icono de ancla opcional, 44 px táctiles, tokens semánticos |
| Contenedores y layout | `Container.tsx`, `Card.tsx`, `PageHeader.tsx`, `IconBox.tsx` | Radios sobrios (`rounded-sm` / `rounded-md` / `rounded-lg`); prohibido `rounded-3xl`/`4xl` en tablas desktop |
| Navegación por pestañas | `TabNav.tsx` | Única implementación `role="tablist"` con navegación por teclado APG |
| Modales y confirmación | `CinematicModal.tsx`, `ConfirmationModal.tsx` | CSS-first con focus trap, retorno de foco y cierre con `Escape` |
| Tablas de datos | `DataTable.tsx`, `DataTableHeader.tsx`, `DataTableRow.tsx`, `SortableHeader.tsx`, `PaginationControls.tsx`, `ReportTable.tsx` | Basadas en TanStack Table con `aria-sort` accesible |
| Estados y feedback | `Badge.tsx`, `RoleBadge.tsx`, `EmptyState.tsx`, `Skeleton.tsx`, `LoadingSpinner.tsx`, `LoadingOverlay.tsx`, `LiveStatus.tsx`, `ToastItem.tsx`, `Tooltip.tsx` | `LoadingSpinner` es la única implementación del arco giratorio |

---

## 5. Accesibilidad (WCAG 2.1 AA)

- **Formularios:** todo control declara nombre accesible (`label` + `htmlFor` o `aria-label`) y vincula errores con `aria-invalid` + `aria-describedby`.
- **Contraste:** los tokens de estado (`-surface` + `-text`) y `chart-1..8` están validados matemáticamente (≥ 4.5:1 texto, ≥ 3:1 gráfico) en `src/tests/guardrails/statusTokensContrast.test.ts`.
- **Regiones scrollables:** contenedores con scroll acotado (`overflow-*-auto` con `max-h-*`/`max-w-*`) deben declarar `tabIndex={0}`, `role="region"` y `aria-label`.
- **Modales:** `role="dialog"`, `aria-modal="true"`, focus trap y cierre con `Escape`.

---

## 6. Catálogo Storybook y Guardrails

La lista única de archivos certificados vive en [`design-system-certified.json`](design-system-certified.json). Cada entrada cuenta con una historia CSF3 (`*.stories.tsx`) y se sincroniza con el catálogo interno (`/design-system`, rol `Administrador`) mediante:

```bash
npm run catalog:manifest        # Regenera src/features/design-system/certifiedStoryManifest.ts
npm run catalog:manifest:check  # Verifica sincronía
```

Comandos diarios de trabajo y verificación desde `frontend/` (o `npm run dev` desde la raíz, que levanta también Storybook en `http://127.0.0.1:6006`):

```bash
npm run storybook               # Playground interactivo (http://127.0.0.1:6006)
npm run storybook:build         # Compila el catálogo estático
npm run storybook:visual        # Regresión visual claro/oscuro de primitivas
npm run audit:design-system     # Scorecard y ratchets (design-system-budget.json)
npm run guardrails              # Suite completa de guardrails de UI y arquitectura
```
