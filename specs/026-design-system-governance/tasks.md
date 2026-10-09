# Tareas 026: Design System Governance

Spec: [spec.md](file:///specs/026-design-system-governance/spec.md). Plan: [plan.md](file:///specs/026-design-system-governance/plan.md).

Reglas: una tarea = un commit o PR revisable. Cada tarea cita su AC.

- [x] T1: Crear regla modular de gobernanza agéntica [.agents/rules/design-system-governance.md](file:///.agents/rules/design-system-governance.md) (AC2)
- [x] T2: Estandarizar componentes atómicos en [src/components/ui/](file:///frontend/src/components/ui/) ([Button.tsx](file:///frontend/src/components/ui/Button.tsx), [Input.tsx](file:///frontend/src/components/ui/Input.tsx), [Card.tsx](file:///frontend/src/components/ui/Card.tsx), [Badge.tsx](file:///frontend/src/components/ui/Badge.tsx)) alineados a tokens semánticos (AC1)
- [x] T3: Implementar suite de guardrails de diseño en [frontend/src/tests/guardrails/designSystemGuardrails.test.ts](file:///frontend/src/tests/guardrails/designSystemGuardrails.test.ts) que audite ausencia de clases HEX e inline styles (AC3)
- [x] T4: Completar y validar ADR-0020 [docs/adr/0020-design-system-governance.md](file:///docs/adr/0020-design-system-governance.md) (AC4)
- [x] T5: Correr suite completa de validación (`npm run check`, `npm run lint`, `npm run spec:check`, `npm run docs:check`) y actualizar tareas (AC5)
