# Plan 003: Gobernanza de base roca

Spec: `./spec.md`. Constitución: `../constitution.md`. Estado: En ejecución.

## Estrategia

1. Añadir a `AGENTS.md` y a los 3 prompts de `jules-scheduled.yml` la
   regla: subject Conventional puro, sin emoji ni prefijo.
2. Activar `@vitest/coverage-v8` con thresholds iniciales = cobertura
   actual (ratchet, mismo patrón que `lint-budget`).
3. Job e2e mínimo en CI: levantar `compose.staging`, smoke login + health.
4. Job docs: Prettier check + link-check sobre `docs/adr/` y `specs/`.
5. Dejar G-05 como criterio escrito, sin implementar.

## Archivos a tocar

| Archivo                                 | Cambio                        |
| --------------------------------------- | ----------------------------- |
| `AGENTS.md`                             | regla de commits para agentes |
| `.github/workflows/jules-scheduled.yml` | prompts sin emoji             |
| `backend/vitest.config.ts`              | coverage thresholds           |
| `frontend/` vitest                      | coverage thresholds           |
| `.github/workflows/ci.yml`              | jobs e2e + docs               |

## Contratos afectados

Ninguno de runtime. CI se vuelve más estricto: PRs con baja cobertura
o links rotos fallan.

## Riesgos y rollback

Thresholds mal calibrados bloquean todo: medir cobertura real primero
y fijar el ratchet en ese valor.

## Verificación

CI verde en `main` tras merge + siguiente ciclo Jules sin emoji.
