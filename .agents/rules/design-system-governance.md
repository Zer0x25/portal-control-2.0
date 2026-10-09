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
- **Contraste & Dark Mode**: El soporte para Dark Mode es automático mediante las variables semánticas de `index.css`. No agregar overrides condicionales redundantes como `dark:bg-slate-900` cuando `bg-token-surface-card` resuelve ambos temas sin fricción.
- **Áreas táctiles mínimas**: En elementos interactivos móviles, asegurar altura mínima táctil de 40px–44px.
