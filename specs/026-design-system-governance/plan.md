# Plan 026: Design System Governance

Spec: [spec.md](file:///specs/026-design-system-governance/spec.md). Constitución: [constitution.md](file:///specs/constitution.md).

## Estrategia

1. **Formalización de Regla Agéntica**:
   Crear [.agents/rules/design-system-governance.md](file:///.agents/rules/design-system-governance.md) con invariantes obligatorias para agentes y desarrolladores: uso de tokens `token-*`, prohibición de clases HEX arbitrarias e inline styles, adopción obligatoria de componentes primitivos oficiales y respeto a performance.
2. **Consolidación de Tokens en Tailwind v4**:
   En [frontend/src/index.css](file:///frontend/src/index.css), asegurar que todos los tokens semánticos de superficie, bordes, texto, estados y acentos estén mapeados a variables CSS con soporte dark/light mode, permitiendo deprecación limpia de referencias `sap-*`.
3. **Estandarización de Componentes Atómicos**:
   Actualizar [Button.tsx](file:///frontend/src/components/ui/Button.tsx), [Input.tsx](file:///frontend/src/components/ui/Input.tsx), [Card.tsx](file:///frontend/src/components/ui/Card.tsx) y [Badge.tsx](file:///frontend/src/components/ui/Badge.tsx) para usar únicamente los tokens semánticos `token-*` y sus variantes canónicas, asegurando accesibilidad (ARIA) y foco visible.
4. **Implementación de Guardrails Automatizados**:
   Crear la suite de pruebas [frontend/src/tests/guardrails/designSystemGuardrails.test.ts](file:///frontend/src/tests/guardrails/designSystemGuardrails.test.ts) que inspecciona estáticamente el código para impedir regresiones de diseño (detección de clases arbitrarias `#[0-9a-fA-F]`, inline styles injustificados y tags HTML crudos en vistas). Integrar la suite en el comando `npm run guardrails`.
5. **Formalización del ADR-0020**:
   Completar [docs/adr/0020-design-system-governance.md](file:///docs/adr/0020-design-system-governance.md) documentando la decisión arquitectónica permanente y garantizando la coherencia de enlaces relativos.

## Archivos a tocar

| Archivo                                                        | Cambio                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `.agents/rules/design-system-governance.md`                    | Nueva regla modular con directrices y restricciones de UI para agentes |
| `frontend/src/index.css`                                       | Mapeo y formalización de tokens semánticos del sistema                 |
| `frontend/src/components/ui/Button.tsx`                        | Alineación 100% a tokens semánticos oficiales                          |
| `frontend/src/components/ui/Input.tsx`                         | Alineación a tokens de foco/borde/error y soporte de accesibilidad     |
| `frontend/src/components/ui/Card.tsx`                          | Alineación a tokens de superficie y cabecera                           |
| `frontend/src/components/ui/Badge.tsx`                         | Migración de clases de color a tokens oficiales                        |
| `frontend/src/tests/guardrails/designSystemGuardrails.test.ts` | Test guardrail para bloquear clases arbitrarias e inline styles        |
| `frontend/package.json`                                        | Incorporación de la suite de guardrail de diseño en scripts si aplica  |
| `docs/adr/0020-design-system-governance.md`                    | Registro de decisión arquitectónica permanente                         |
| `specs/026-design-system-governance/tasks.md`                  | Trazabilidad y seguimiento de tareas                                   |

## Contratos afectados

- Clases de utilidad en Tailwind v4 (`--color-token-*`, `bg-token-*`, etc.).
- Interfaces de props de componentes UI (`ButtonProps`, `InputProps`, `CardProps`, `BadgeProps`).
- No afecta contratos de base de datos ni endpoints HTTP de Fastify.

## Riesgos y rollback

- **Riesgo**: Variaciones sutiles de color al reemplazar clases `sap-*` por tokens `token-*`.
  - **Mitigación**: Los tokens `token-*` apuntan a las mismas variables CSS subyacentes (`--surface-app`, `--accent-professional`, `--status-*`).
- **Rollback**: Revertir los commits de la rama `feat/design-system-governance`.

## Verificación

```bash
cd frontend && npm run check
cd frontend && npm run test:guardrails
npm run spec:check
npm run docs:check
npm run lint:budget
```
