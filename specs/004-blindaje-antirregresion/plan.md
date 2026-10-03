# Plan 004: Blindaje antiregresión

Spec: `./spec.md`. Constitución: `../constitution.md`. Estado: En ejecución.

## Estrategia

1. Staging con imágenes locales (`compose.staging.yaml` + PgBouncer +
   gateway, puertos 8080/5434) y smoke headless contra él (AC1).
2. Baseline e2e: correr cada spec contra staging, clasificar fallos
   (timeout de boot vs selector podrido vs bug real) sin arreglar (AC2).
3. Cobertura: medir por servicio, elegir los 3 con más lógica y menos
   cobertura, escribir unit tests, subir ratchets (AC3).
4. Reescritura e2e por spec, validando en local hasta verde total (AC4).

## Archivos a tocar

| Archivo                                               | Cambio                    |
| ----------------------------------------------------- | ------------------------- |
| `specs/004-blindaje-antirregresion/*`                 | esta hoja de ruta         |
| `backend/vitest.config.ts`, `frontend/vite.config.ts` | subir thresholds (fase 2) |
| `frontend/e2e/**`                                     | reescritura (fase 3)      |
| `.env.staging` (no commitear)                         | `JWT_SECRET` para staging |

## Contratos afectados

Ninguno en fase 1. Fases 2-3 no tocan contratos (solo tests y ratchets).

## Riesgos y rollback

- Staging ocupa 8080/5434: colisión improbable; `down` libera todo.
- `.env.staging` con secretos: jamás commitear (gitignore).
- Rollback: `docker compose -f compose.staging.yaml down -v`.

## Verificación

- `curl -sf http://127.0.0.1:8080/api/health`
- `npx playwright test e2e/smoke.spec.ts` (frontend, con env a staging)
- `npm run test:coverage` por paquete (fases 2+)
