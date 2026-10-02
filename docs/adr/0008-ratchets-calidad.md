# ADR-0008: Ratchets de calidad (lint-budget 0 + validación)

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: retroactivo desde código

## Contexto

Warnings ESLint no fallan el build y se acumulan (389 al inicio).
Rutas mutantes sin validación Zod también se acumulaban sin control.

## Decisión

1. Ratchet ESLint: `lint-budget.json` pineado en 0 warnings/0 errores.
   `npm run lint:budget` falla si el conteo real es mayor
   (`package.json:6-8`, `AGENTS.md:65-107`). Solo se toca con
   `lint:budget:update` tras eliminar warnings, en el mismo commit.
2. Ratchet de validación: `ALLOWED_UNVALIDATED_ROUTES = 0` en
   `tests/architecture-guard.test.ts`. Toda ruta mutante nueva sin
   `validate` falla hasta validarse o justificarse inline
   (`AGENTS.md:260-264`).
3. Pre-commit: format + lint + budget. Pre-push: `validate:ci` completo
   (`package.json:9-10`).

## Alternativas consideradas

1. Tolerar warnings con umbral alto — descartada porque el umbral se
   vuelve techo y nunca baja.
2. Revisión manual de validación — descartada porque no escala con
   agentes autónomos.

## Consecuencias

Positivas:

- Campaña 389 → 0 consolidada; toda regresión es CI rojo.
- Agentes (Jules) reciben feedback determinista.

Negativas / costos aceptados:

- Subir el budget requiere decisión explícita y mensaje de commit.
- `lint:fix` no resuelve estos warnings; el trabajo es manual.

## Referencias

- `lint-budget.json` — baseline 0.
- `scripts/lint-budget.cjs` — enforcement.
- `package.json:9-10` — hooks pre-commit/pre-push.
- `AGENTS.md:65-107,266-273` — política de ratchets.
