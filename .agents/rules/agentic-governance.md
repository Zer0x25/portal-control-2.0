---
trigger: model_decision
description: Invariants for agentic workflow, rule hygiene, AGENTS.md budget, and separation of concerns between docs.
---

# Agentic Workflow & Rule Hygiene

## 1. Separación Estricta de Documentación

- **`AGENTS.md` (Always-On Global)**: Invariantes críticas del proyecto que aplican a toda tarea. Límite estricto: &le; 120 líneas (&le; 8 KB) para evitar truncamiento en el system prompt.
- **`.agents/rules/*.md` (On-Demand)**: Directrices técnicas detalladas de un dominio específico (BD, API, linting, CI). Siempre deben incluir YAML frontmatter con `trigger: model_decision` y una `description` concisa.
- **`README.md` (Operación Humana)**: Topología de infraestructura, configuración de Portainer, setup local para desarrolladores.
- **`specs/` y `docs/` (Histórico & Producto)**: Especificaciones BDD/TDD, deudas de módulos, backlogs y ADRs.

## 2. Prohibiciones de Inclusión en AGENTS.md

- **No incluir bitácoras históricas**: No registrar resultados de campañas pasadas (ej. "389 -> 0 warnings").
- **No incluir playbooks paso a paso de refactorización**: Pertenecen a `.agents/rules/` o a la spec correspondiente.
- **No duplicar información**: Si algo ya está en un ADR o en una spec, solo se enlaza; nunca se copia el párrafo completo.

## 3. Ciclo SDD + ADR Obligatorio

- Todo cambio funcional nuevo (`feat:`) o refactorización de arquitectura (`refactor:`) debe nacer con un spec en `specs/NNNN-slug/` (`npm run spec:new <slug>`) antes de escribir código.
- Decisiones arquitectónicas permanentes se promueven a `docs/adr/`. Ver [sdd-governance.md](file:///.agents/rules/sdd-governance.md) y la skill `sdd-cycle`.

## 4. Disciplina Pre-PR: Pruebas Exhaustivas Locales

- **Prohibido abrir PRs solo con validación ligera**: Antes de crear un Pull Request (`gh pr create`) o solicitar fusión hacia `main`, el agente o colaborador DEBE ejecutar la validación exhaustiva (`node .agents/skills/ci-preflight/scripts/preflight.cjs --pr` o `npm run test:run:ci` en los paquetes modificados).
- **GitHub Actions como Último Salvavidas**: CI en remoto valida la integración y despliegue final, pero toda regresión unitaria debe detectarse y resolverse localmente antes de llegar al repositorio remoto.
