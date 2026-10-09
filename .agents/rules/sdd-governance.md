---
trigger: model_decision
description: Invariants and execution rules for Spec-Driven Development (SDD) and Architecture Decision Records (ADR).
---

# Spec-Driven Development (SDD) & Architecture Decision Records (ADR)

## 1. Invariante: Spec antes que Código (Principio V)

- **Obligatoriedad**: Ningún cambio funcional nuevo (`feat:`) o refactorización arquitectónica mayor (`refactor:`) puede codificarse sin un spec activo en `specs/NNNN-slug/`.
- **Scaffolding automatizado**: Usar `npm run spec:new <slug>` (o `npm run spec:new <slug> -- --adr`) para inicializar el correlativo y las plantillas oficiales.
- **Estructura tripartita**:
  - `spec.md`: Problema con evidencia, alcance (dentro/fuera) y **Criterios de aceptación** verificables (`- [ ] AC1:...`).
  - `plan.md`: Estrategia técnica en pasos, tabla de archivos a modificar, contratos afectados y plan de rollback.
  - `tasks.md`: Lista de tareas atómicas ejecutables (`- [ ] T1:... (AC1)`), donde 1 tarea = 1 commit o PR revisable.

## 2. Disciplina de Ejecución y TDD

- **Trazabilidad directa**: Cada tarea en `tasks.md` debe citar explícitamente sus criterios de aceptación (`AC`).
- **Pruebas antes de implementación**: Para cada tarea funcional, escribir primero los tests unitarios o de integración correspondientes (Vitest/Playwright).
- **Marcado de progreso**: Marcar `[x]` en `tasks.md` a medida que cada hito se completa y valida.

## 3. Promoción a ADR (Architecture Decision Record)

- **Criterio de promoción**: Toda decisión estructural permanente (estrategia de pooling en BD, modelo de auth/tokens, arquitectura Fastify, invariantes CI/CD o ratchets) debe promoverse a `docs/adr/00XX-slug.md`.
- **Plantilla e Índice**: Usar la estructura de [docs/adr/0000-template.md](file:///docs/adr/0000-template.md). Todo nuevo ADR numerado **debe** indexarse de inmediato en la tabla de [docs/adr/README.md](file:///docs/adr/README.md).

## 4. Validación de Integridad

- **Checks de gobernanza**:
  - `npm run spec:check`: Verifica que todas las specs contengan `spec.md`, `plan.md`, `tasks.md` y checkboxes válidos.
  - `npm run docs:check`: Verifica enlaces markdown relativos y consistencia de índices de ADRs.
- **Preflight completo**: Correr siempre `npm run preflight` antes de generar commits para asegurar 0 warnings de lint, tipos estrictos y cumplimiento de gobernanza.
