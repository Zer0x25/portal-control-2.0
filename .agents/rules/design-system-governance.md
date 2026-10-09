---
trigger: model_decision
description: Invariants for frontend design system, semantic tokens, component primitives, accessibility, and anti-drift UI rules.
---

# Frontend Design System & UI Governance

Directrices obligatorias para agentes de IA y desarrolladores al construir o modificar componentes y vistas en `frontend/src/`.

---

## 1. Tokens Semánticos Obligatorios (Anti-Drift)

- **Prohibido el uso de colores HEX arbitrarios**: No usar clases ad-hoc como `bg-[#0f172a]`, `text-[#38bdf8]`, `border-[#e2e8f0]` en código de producción. Toda la interfaz debe consumir los tokens semánticos definidos en `frontend/src/index.css`.
- **Prohibido el uso de estilos inline (`style={{ ... }}`)**: Salvo valores numéricos calculados dinámicamente en tiempo de ejecución (ej. porcentaje exacto en barra de progreso o coordenadas de posición absoluta dinámica).
- **Consumo canónico de tokens**:
  - **Superficies**: `bg-token-surface-app`, `bg-token-surface-card`, `bg-token-surface-header`, `bg-token-surface-hover`, `bg-token-surface-active`, `bg-token-surface-stripe`, `bg-token-surface-technical`.
  - **Bordes**: `border-token-border-technical`, `border-token-border-subtle`, `border-token-border-focus`.
  - **Textos**: `text-token-text-primary`, `text-token-text-secondary`, `text-token-text-tertiary`, `text-token-text-onAccent`.
  - **Estados**: `bg-token-status-success`, `bg-token-status-error`, `bg-token-status-warning`, `bg-token-status-info` (y sus variantes de texto correspondientes).
  - **Marca / Acento**: `bg-token-accent-brand`, `text-token-accent-brand`.

---

## 2. Componentes Primitivos Canónicos (`src/components/ui/`)

- **Prohibido HTML crudo en formularios y acciones de vistas**:
  - No usar `<button>` nativo con clases CSS largas en `*.view.tsx`: importar y usar `Button` de `src/components/ui/Button.tsx`.
  - No usar `<input>` nativo con clases ad-hoc: usar `Input` de `src/components/ui/Input.tsx`.
  - No usar contenedores con bordes manuales para paneles principales: usar `Card` de `src/components/ui/Card.tsx`.
  - No armar píldoras de estado desde cero: usar `Badge` de `src/components/ui/Badge.tsx`.
  - Para envolver vistas y secciones principales: usar `Container` de `src/components/ui/Container.tsx` (`standard`: máx 1280px / 7xl, `wide`: máx 1440px, `narrow`: máx 896px / 4xl, `fluid`: ancho completo), garantizando centrado automático (`mx-auto`) y paddings elásticos.
  - Para ventanas flotantes y modales: usar `CinematicModal` de `src/components/ui/CinematicModal.tsx` o dialogs oficiales.
  - Para listas vacías o estados de error: usar `EmptyState` de `src/components/ui/EmptyState.tsx`.

---

## 3. Tipografía & Jerarquía Visual

- Usar las utilidades tipográficas del sistema:
  - `typo-ui-title`: Títulos de panel y secciones principales.
  - `typo-ui-tab`: Pestañas y selectores de sección.
  - `typo-ui-label`: Etiquetas de formulario y metadatos secundarios.
  - `typo-ui-badge`: Textos en badges y chips compactos.
  - `typo-ui-meta`: Textos de detalle técnico y fechas.
- Fuentes: `font-sans` (Inter) para UI general y narrativa, `font-mono` (Roboto Mono) para códigos, IDs, timestamps y valores numéricos tabulares.

---

## 4. Micro-animaciones e Higiene de Rendimiento

- En conformidad con [frontend-performance.md](file:///.agents/rules/frontend-performance.md):
  - **Cero `framer-motion` en componentes atómicos**: Prohibido envolver `Card`, `Button`, `Badge` o filas de tablas con `motion.div`.
  - Micro-animaciones aceleradas por hardware vía CSS de Tailwind v4: `animate-in fade-in duration-150`, `hover:-translate-y-0.5 active:translate-y-0 active:scale-95`.
  - Respeto al modo de alto rendimiento (`html[data-ui-perf="high"]`) y preferencia del sistema (`prefers-reduced-motion`).

---

## 5. Accesibilidad (A11y) y Dark Mode Nativo

- **A11y de Formularios**: Todo `Input` o control interactivo debe proveer `id` explícito vinculado a su `label` (`htmlFor`). Si hay error, vincular con `aria-invalid` y `aria-describedby`.
- **Contraste & Dark Mode**:
  - El soporte para Dark Mode es automático mediante las variables semánticas de `index.css`. No agregar overrides condicionales redundantes como `dark:bg-slate-900` cuando `bg-token-surface-card` resuelve ambos temas sin fricción.
  - **Ratios WCAG AA Obligatorios (≥ 4.5:1)**:
    - Para textos sobre fondos de estado de error/alerta en modo claro, usar obligatoriamente `text-token-status-error-text` (`#b91c1c`).
    - Para textos o iconos sobre fondos de acento celeste (`sky-400` / SAP blue) en modo oscuro, usar obligatoriamente `text-token-text-onAccent` (`#020617`).
- **Cierre Accesible de Modales (WAI-ARIA)**:
  - Todo componente modal o diálogo interactivo (`role="dialog"`, `aria-modal="true"`) debe implementar un manejador de teclado para la tecla `Escape` que ejecute `onClose()` y libere las capas de bloqueo de puntero (`z-50`, `z-100`).
- **Áreas táctiles mínimas**: En elementos interactivos móviles, asegurar altura mínima táctil de 40px–44px.

---

## 6. Layout Responsivo, PWA y Navegación Headless para Agentes

- **Tolerancia 320px (WCAG 1.4.10 Reflow)**:
  - Prohibidos anchos rígidos incondicionales en píxeles mayores a 320px (ej. `w-[400px]`, `min-w-[500px]`) que provoquen scroll horizontal en pantallas móviles. Todo ancho debe estar acotado por `max-w-*` o condicionado por breakpoints (`sm:`, `md:`, `lg:`).
  - Escala de padding lateral seguro: `px-4` móvil (16px), `sm:px-6` tablet (24px), `lg:px-8` desktop (32px).
- **Viewport Dinámico y Safe Areas en PWA**:
  - Para alturas completas de pantalla en layouts o shells, usar siempre `min-h-dvh` o `h-dvh` en vez de `100vh` / `h-screen` para evitar saltos de interfaz por barras dinámicas del navegador móvil.
  - Para notch y barra inferior en PWA, consumir utilidades semánticas `pb-safe`, `pt-safe`, `p-safe` de `frontend/src/index.css`.
- **Navegación Determinista para Agentes (Headless Automation)**:
  - Landmarks semánticos obligatorios en el shell:
    - `<header role="banner" data-testid="app-header">`
    - `<aside role="complementary" data-testid="app-sidebar">`
    - `<nav role="navigation" aria-label="Menú principal" data-testid="main-navigation">`
    - `<main id="main-content" role="main" data-testid="main-content">`
    - `<a href="#main-content" data-testid="skip-to-content">` (Skip link accesible)
  - Enlaces de navegación con atributos de introspección:
    - `data-testid={`nav-item-${slug}`}`
    - `data-nav-to={to}`
    - `data-nav-active="true|false"`
  - El shell raíz debe publicar metadatos de ruta: `data-testid="app-shell"` y `data-current-path={path}`.

---

## 7. Auditoría, Certificación de Primitivas y Paridad de Guardrails

- **Paridad Estricta de Archivos Certificados (`CERTIFIED_FILES`)**:
  - Toda primitiva atómica o de layout en `src/components/ui/` (ej. `Button.tsx`, `Container.tsx`, `Card.tsx`, `Input.tsx`, `Badge.tsx`) y shells de layout (`src/components/layout/`) debe estar registrada obligatoriamente en la lista de archivos certificados de **ambos** mecanismos de control:
    1. El script auditor CLI: `frontend/scripts/audit-design-system.cjs`.
    2. La suite de pruebas de guardrails: `frontend/src/tests/guardrails/designSystemGuardrails.test.ts`.
  - Prohibido agregar o remover componentes de una lista sin replicarlo exactamente en la otra.
- **Presupuesto Monótono en Cero (`design-system-budget.json`)**:
  - El presupuesto de desvíos (`totalIssuesBudget`) se encuentra fijado en `0`. Ningún cambio puede elevar este valor.
  - Al certificar nuevos componentes o migrar vistas, actualizar el recuento ejecutando `node scripts/audit-design-system.cjs --update` y validar con `npm run test:guardrails`.

---

## 8. Estandarización de Vistas (.view.tsx), Guardrails y Mocking en Tests

- **Envoltorio Canónico Obligatorio en Vistas**:
  - Todo archivo de vista (`*.view.tsx`) debe envolver su JSX principal en el componente `Container`:
    ```tsx
    <Container
      variant="wide" // o "standard" / "fluid" según el tipo de pantalla
      noPadding
      data-ui-protected
      className="[clases-existentes-de-la-vista]"
    >
      {/* contenido de la vista */}
    </Container>
    ```
  - Debe conservarse siempre el comentario superior: `/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL */`.
  - La vista debe registrarse en el listado `migratedViews` de `frontend/src/tests/guardrails/responsiveViewportGuardrails.test.ts`.

- **Aserciones en Pruebas Unitarias de Vistas**:
  - Los tests de componentes de vista deben asertar explícitamente:
    `expect(screen.getByTestId("page-container")).toBeInTheDocument();`.

- **Higiene en Mocking de `framer-motion`**:
  - Al mockear `motion` en Vitest, filtrar propiedades no estándar del DOM (`layout`, `layoutId`, `whileHover`, etc.) para evitar advertencias en consola de React:
    ```tsx
    vi.mock("framer-motion", () => ({
      motion: {
        div: ({ children, layout: _layout, layoutId: _layoutId, ...props }: React.HTMLAttributes<HTMLDivElement> & { layout?: unknown; layoutId?: unknown }) => <div {...props}>{children}</div>,
      },
      AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    }));
    ```
