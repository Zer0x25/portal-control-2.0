# Spec 026: Design System Governance

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-09
- ADR relacionado: [0020-design-system-governance.md](file:///docs/adr/0020-design-system-governance.md)

## Problema

Actualmente el frontend presenta divergencias estilísticas acumuladas:

1. Coexistencia de tokens legacy con prefijo técnico (`--color-sap-*`) y tokens semánticos modernos (`--color-token-*`), lo que genera confusión al seleccionar clases de color.
2. Uso ocasional de clases arbitrarias (ej. colores en formato HEX en clases Tailwind) e inline styles en vistas y componentes, lo que dificulta el mantenimiento del modo oscuro y la consistencia visual.
3. Ausencia de una regla explícita de gobernanza para agentes de IA (Google Jules, Antigravity, etc.) que prevenga el desvío del diseño ("design drift"), la reinvención de botones o inputs nativos, o el uso indebido de librerías de animación en componentes atómicos.

## Alcance

Dentro:

- Formalización de los tokens semánticos oficiales (`token-*`) en [index.css](file:///frontend/src/index.css) para superficies, textos, bordes, estados y acentos.
- Estandarización y alineación completa de los componentes primitivos core en [src/components/ui/](file:///frontend/src/components/ui/) (`Button`, `Input`, `Card`, `Badge`).
- Creación de la regla de gobernanza agéntica [.agents/rules/design-system-governance.md](file:///.agents/rules/design-system-governance.md).
- Implementación de guardrails de CI en [frontend/src/tests/guardrails/designSystemGuardrails.test.ts](file:///frontend/src/tests/guardrails/designSystemGuardrails.test.ts) que auditen la ausencia de clases HEX arbitrarias e inline styles en componentes UI y vistas clave.
- Formalización del Architecture Decision Record [docs/adr/0020-design-system-governance.md](file:///docs/adr/0020-design-system-governance.md).

Fuera (explícito):

- Reescritura masiva de todas las vistas del sistema en un solo PR (la adopción de las vistas se apoya en los componentes base y en la suite de guardrails).
- Instalación de frameworks de componentes de terceros pesados que incrementen el bundle o comprometan la performance.

## Criterios de aceptación

- [x] AC1: Los componentes core ([Button.tsx](file:///frontend/src/components/ui/Button.tsx), [Input.tsx](file:///frontend/src/components/ui/Input.tsx), [Card.tsx](file:///frontend/src/components/ui/Card.tsx), [Badge.tsx](file:///frontend/src/components/ui/Badge.tsx)) consumen exclusivamente tokens semánticos oficiales (`token-*`), eliminando dependencias de prefijos legacy `sap-*`.
- [x] AC2: La regla de gobernanza agéntica [.agents/rules/design-system-governance.md](file:///.agents/rules/design-system-governance.md) define las invariantes de UI y es descubierta por el entorno de agentes.
- [x] AC3: Existe una suite de pruebas de guardrails [frontend/src/tests/guardrails/designSystemGuardrails.test.ts](file:///frontend/src/tests/guardrails/designSystemGuardrails.test.ts) integrada en `npm run guardrails` que previene el uso de clases HEX arbitrarias (`#[0-9a-fA-F]`) y estilos inline no justificados.
- [x] AC4: El ADR-0020 [docs/adr/0020-design-system-governance.md](file:///docs/adr/0020-design-system-governance.md) documenta la decisión estructural y está indexado en [docs/adr/README.md](file:///docs/adr/README.md).
- [x] AC5: La suite de validación completa (`npm run check`, `npm run lint`, `npm run spec:check`, `npm run docs:check`) ejecuta en verde con 0 warnings.

## Restricciones

- Mantener estricto cumplimiento del presupuesto de líneas de [AGENTS.md](file:///AGENTS.md) (≤ 120 líneas / ≤ 8 KB).
- Respeto irrestricto de las invariantes de [frontend-performance.md](file:///.agents/rules/frontend-performance.md) (cero `motion.div` en átomos, animaciones aceleradas por GPU).
- Compatibilidad total con Dark Mode automático vía tokens CSS.

## Trazabilidad

- Tests que lo probarán: [frontend/src/tests/guardrails/designSystemGuardrails.test.ts](file:///frontend/src/tests/guardrails/designSystemGuardrails.test.ts).
- Docs a actualizar: [docs/adr/0020-design-system-governance.md](file:///docs/adr/0020-design-system-governance.md), [.agents/rules/design-system-governance.md](file:///.agents/rules/design-system-governance.md).
