# Registro de deuda técnica

Criterio de triaje (cuestionario 2026-10-04): es **deuda** si el
comportamiento actual es temporal, no documentado como decisión, o
contradice el contrato/UX esperado. Es **diseño** si es intencional,
documentado (ADR o este registro) y el comportamiento es el esperado.

Regla condicional: un `404` por recurso ausente es diseño; el mismo
`404` con el recurso cargado es bug (deuda).

## Deuda aceptada

| ID     | Item                                     | Evidencia                                                                                                                                 | Estado                                            |
| ------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TD-001 | Contraste AA insuficiente (tema oscuro)  | ~30 nodos axe-core `serious/moderate`, backlog de paleta industrial                                                                       | Abierta                                           |
| TD-002 | `useWeather` con datos mock/aleatorios   | `frontend/src/hooks/useWeather.ts:12-29`; integrar Open-Meteo (sin key)                                                                   | Abierta                                           |
| TD-003 | Seed global EMP001/juan.perez compartido | Factoría `e2e/helpers/worker-factory.ts` (kiosk migrado); restan user-flows/business-flows/load; sin DELETE employees (residual fila E2E) | Parcial                                           |
| TD-004 | Huecos restantes del barrido e2e         | `specs/005-flujos-de-testing/e2e-stress-plan.md`                                                                                          | Cerrada 2026-10-04 (`e2e/td004-gaps.spec.ts` 6/6) |

## Diseño intencional (no deuda)

| ID    | Item                                                   | Por qué es diseño                                                                                                              |
| ----- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| D-001 | `GET /api/configs/public/company-policy` → 404 sin PDF | Respuesta "vacío" esperada (`backend/src/controllers/configController.ts:91-95`); solo es bug si hay PDF cargado y aun así 404 |
| D-002 | Tokens de rol `Usuario` ~2 min                         | Kiosco de corta duración, por diseño (ver ADR-0016)                                                                            |
| D-003 | Integración backend contra BD de dev compartida        | Estrategia aceptada; Testcontainers queda como mejora no requerida                                                             |
| D-004 | Staging exige `--env-file .env.staging` siempre        | Explícito a propósito (ver ADR-0016)                                                                                           |
