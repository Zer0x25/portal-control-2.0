# Registro de deuda técnica

Criterio de triaje (cuestionario 2026-10-04): es **deuda** si el
comportamiento actual es temporal, no documentado como decisión, o
contradice el contrato/UX esperado. Es **diseño** si es intencional,
documentado (ADR o este registro) y el comportamiento es el esperado.

Regla condicional: un `404` por recurso ausente es diseño; el mismo
`404` con el recurso cargado es bug (deuda).

## Deuda aceptada

| ID     | Item                                     | Evidencia                                                                                                                   | Estado                                                                                                                                             |
| ------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-001 | Contraste AA insuficiente (tema oscuro)  | Tokens + 9 nodos corregidos, gate critical+serious en `e2e/a11y.spec.ts` (3 págs × 2 temas)                                 | Cerrada 2026-10-04 (`53c491d`)                                                                                                                     |
| TD-002 | `useWeather` con datos mock/aleatorios   | Open-Meteo real (`frontend/src/hooks/useWeather.ts`), cache 30min, 4 tests                                                  | Cerrada 2026-10-04 (`61dba33`)                                                                                                                     |
| TD-003 | Seed global EMP001/juan.perez compartido | Factoría e2e (`worker-factory.ts`) + load (`e2e-worker.cjs`); 0 usos en specs/runners (seed solo compat + fixture búsqueda) | Cerrada 2026-10-04 — residual aceptado: filas empleado `E2E` huérfanas se purgan por SQL/reseed, sin `DELETE /api/employees` (decisión 2026-10-04) |
| TD-004 | Huecos restantes del barrido e2e         | `specs/005-flujos-de-testing/e2e-stress-plan.md`                                                                            | Cerrada 2026-10-04 (`e2e/td004-gaps.spec.ts` 6/6)                                                                                                  |
| TD-005 | Contraste de tokens de estado en superficies tenues (story tests) | Primer run de story tests (spec 122): 57 violaciones `color-contrast` — pares `token-status-{success,error,warning}` y grises terciarios de 10-12px sobre fondos al 5-10% (`/10`, `/05`), ratio 1.75-3.77 vs 4.5 exigido. Regla deshabilitada en `frontend/.storybook/preview.ts` (ratchet); el resto de reglas axe sigue en `test: "error"`. Cierre: ajustar los pares texto/fondo en `frontend/tokens.json` (o tokens `-text` dedicados) y re-habilitar la regla. Incluye vivid `Badge` (2.07), `TimeRecordTable` fin-de-registros (1.97), `SmtpConfig` captions (#99bcd3 sobre #005792 = 3.77), `MetricCard`, `ReportTable*`, `ShiftCalendar*`, `listTokens`, `PasswordChangeForm`, formularios con error, LeaveManager, Seeding/SMTP/Import modals. | Abierta 2026-11-26 (spec 122 / ADR-0033)                                                                                                            |

## Diseño intencional (no deuda)

| ID    | Item                                                   | Por qué es diseño                                                                                                             |
| ----- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| D-001 | `GET /api/configs/public/company-policy` → 404 sin PDF | Respuesta "vacío" esperada (`backend/src/modules/configs/application/flows.ts`); solo es bug si hay PDF cargado y aun así 404 |
| D-002 | Tokens de rol `Usuario` ~2 min                         | Kiosco de corta duración, por diseño (ver ADR-0016)                                                                           |
| D-003 | Integración backend contra BD de dev compartida        | Estrategia aceptada; Testcontainers queda como mejora no requerida                                                            |
| D-004 | Staging exige `--env-file .env.staging` siempre        | Explícito a propósito (ver ADR-0016)                                                                                          |
