# ADR-0020: Frontend Design System & Gobernanza Agéntica de UI

- Estado: Aceptado
- Fecha: 2026-10-09
- Autores: zer0x

## Contexto

El frontend acumuló inconsistencias de diseño visual y técnico:

1. Convivencia de variables con prefijos legacy (`--color-sap-*`) y tokens semánticos modernos (`--color-token-*`) en `frontend/src/index.css`.
2. Uso de clases CSS con colores HEX arbitrarios (`bg-[#...]`, `text-[#...]`) e inline styles (`style={{ ... }}`), lo que rompe la consistencia del tema claro/oscuro y perjudica el mantenimiento.
3. Vulnerabilidad a desvíos por agentes de IA ("design drift"): los agentes generativos construyen componentes usando HTML crudo (`<button>`, `<input>`) en lugar del catálogo oficial (`src/components/ui/`), o introducen librerías de animación (`framer-motion`) en componentes atómicos contraviniendo las directrices de performance.

## Decisión

1. **Tokens Semánticos**: Establecer el sistema de tokens semánticos (`token-*`) de Tailwind v4 en `frontend/src/index.css` como la única fuente de verdad para colores, superficies, bordes y estados. Deprecar gradualmente los prefijos `sap-*`.
2. **Componentes Primitivos Obligatorios**: Todos los formularios, acciones y tarjetas deben construirse usando los componentes canónicos de `src/components/ui/` (`Button`, `Input`, `Card`, `Badge`, `CinematicModal`, `EmptyState`).
3. **Gobernanza Agéntica**: Publicar la regla modular `.agents/rules/design-system-governance.md` con las invariantes obligatorias para agentes y desarrolladores.
4. **Guardrails en CI**: Incorporar la suite de pruebas `frontend/src/tests/guardrails/designSystemGuardrails.test.ts` para verificar estáticamente la ausencia de clases HEX arbitrarias e inline styles en vistas y componentes auditados.

## Alternativas consideradas

1. **Framework de Componentes Externo (ej. Radix UI / Shadcn / Material UI)**: Descartada para evitar inflar el bundle de producción y mantener el control total del rendimiento CSS y la compatibilidad con Node 26 + Vite.
2. **Estilos Ad-Hoc sin Gobernanza**: Descartada porque los agentes y desarrolladores seguirían creando combinaciones visuales inconsistentes y rompiendo accesibilidad y dark mode.

## Consecuencias

Positivas:

- Coherencia visual total entre vistas y componentes en temas Claro y Oscuro.
- Prevención de desvíos en PRs generados por agentes de IA mediante guardrails en CI.
- Aceleración de desarrollo: los agentes cuentan con una biblioteca de componentes y tokens clara y documentada.
- Respeto irrestricto de las directrices de performance (cero librerías pesadas en átomos).

Negativas / costos aceptados:

- Esfuerzo de migración progresiva de componentes y vistas legacy para adoptar los nuevos tokens.
- Restricción estricta en el uso de estilos libres o clases de colores no tokenizadas.

## Referencias

- `frontend/src/index.css` — definición de tokens semánticos.
- `frontend/src/components/ui/` — biblioteca de componentes canónicos.
- `.agents/rules/design-system-governance.md` — directrices de gobernanza de UI para agentes.
- `frontend/src/tests/guardrails/designSystemGuardrails.test.ts` — suite de guardrails automatizada.
- `specs/026-design-system-governance/spec.md` — especificación SDD asociada.
