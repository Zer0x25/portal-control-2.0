# ADR-0010: Desarrollo agéntico con SDD mínimo (spec → plan → tasks)

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: opencode

## Contexto

El repo ya es agéntico: `AGENTS.md` como contrato, `.jules/` como memoria,
`jules-scheduled.yml` con Sentinel/Bolt/Code-Health, guardrails en CI
(`.github/workflows/ci.yml:12-69`) y ratchets en 0 (ADR-0008). Pero los
agentes trabajan sobre prompts sueltos o issues: no hay artefacto que diga
qué se quiere (spec), cómo se hará (plan) ni qué es ejecutable (tasks).
Eso genera PRs correctos en forma y equivocados en fondo. Spec piloto:
`specs/001-node24-alignment/`.

## Decisión

SDD mínimo, sin spec-kit pesado:

- `specs/constitution.md`: 5 principios no negociables. Manda sobre specs.
- `specs/NNNN-slug/spec.md` (problema, alcance, criterios de aceptación),
  `plan.md` (estrategia, archivos, contratos, rollback) y `tasks.md`
  (checkboxes ejecutables, 1 tarea = 1 commit revisable).
- Gate `npm run spec:check` (`scripts/spec-check.cjs`) en CI
  (job `spec-check` en `.github/workflows/ci.yml`): todo spec numerado
  debe existir completo y con checkboxes de aceptación.
- Flujo: humano o agente redacta spec → se aprueba → agente ejecuta tasks
  → `validate:ci` → decisión permanente se promueve a ADR.
- Jules `custom` acepta `specs/NNNN-slug/spec.md` como prompt.

## Alternativas consideradas

1. Spec-kit completo de GitHub — descartado por ahora: demasiada
   ceremonia para el tamaño del equipo; reevaluar si SDD mínimo se queda
   corto.
2. Seguir con prompts ad-hoc — descartado porque no deja trazabilidad
   spec → tests → ADR.

## Consecuencias

Positivas:

- Todo cambio funcional nace revisable antes de codificar.
- Jules y OpenCode comparten el mismo artefacto de entrada.

Negativas / costos aceptados:

- Escribir spec/plan/tasks para cambios funcionales, incluso pequeños.
- El gate solo verifica estructura, no calidad del spec (revisión humana).

## Referencias

- `specs/constitution.md` — principios I–V.
- `specs/_template/` — plantillas.
- `specs/001-node24-alignment/` — piloto implementado.
- `scripts/spec-check.cjs` — gate.
- `.github/workflows/ci.yml` — job `spec-check`.
