# Tareas 004: Blindaje antiregresión

Spec: `./spec.md`. Plan: `./plan.md`. Estado: En ejecución.

## Fase 1 — Staging + baseline e2e

- [x] 1.1 Staging arriba (`compose.staging.yaml`) con health OK.
- [x] 1.2 Smoke headless contra staging verde.
- [ ] 1.3 Baseline: correr cada spec e2e, registrar pasa/falla + causa.

## Fase 2 — Cobertura unitaria

- [ ] 2.1 Medir cobertura por archivo, elegir 3 servicios críticos.
- [ ] 2.2 Unit tests nuevos hasta subir thresholds (backend + frontend).
- [ ] 2.3 Ratchets actualizados, `validate:ci` verde, commit.

## Fase 3 — Reescritura e2e

- [ ] 3.1 Reescribir specs podridas contra UI actual.
- [ ] 3.2 Suite completa verde en local.
- [ ] 3.3 Decisión: gatear en CI o no (costo en minutos).
