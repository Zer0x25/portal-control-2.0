# Plan 002: Endurecimiento del runtime HTTP y secretos

Spec: `./spec.md`. Constitución: `../constitution.md`. Estado: Borrador.

## Estrategia

1. CORS: leer `ALLOWED_ORIGINS` (coma-separado) y reflejar solo
   coincidencias; sin variable definida, denegar con credenciales.
2. Body-limit: global 1mb; `express.json({ limit: "50mb" })` solo en el
   router de import.
3. Throttle admin: limiter específico para `/api/admin` o justificación
   escrita en el ADR (auth propia + bajo riesgo).
4. Seed: quitar default de `compose.yaml`, mantener fail-fast de
   `seed.ts:21-24`, eliminar `passwordHash` de los logs.
5. Primer login: auditar `authService`/login; forzar cambio o expirar
   el default.

## Archivos a tocar

| Archivo                                           | Cambio                               |
| ------------------------------------------------- | ------------------------------------ |
| `backend/src/app.ts`                              | CORS allowlist, límites, limiters    |
| `backend/src/middleware/maintenanceMiddleware.ts` | revisar exención admin               |
| `compose.yaml`                                    | quitar default `SEED_ADMIN_PASSWORD` |
| `backend/prisma/seed.ts`                          | logs sin hash                        |
| `frontend/src/store/slices/userSlice.ts`          | según auditoría AC6                  |

## Contratos afectados

Comportamiento CORS y límites de body: cambio visible para clientes.
Versionar en ADR y avisar en PR.

## Riesgos y rollback

Frontend prod debe estar en `ALLOWED_ORIGINS` o queda fuera. Rollback
por revert + redeploy del tag anterior.

## Verificación

Tests de integración por AC + `npm run validate:ci` ambos paquetes.
