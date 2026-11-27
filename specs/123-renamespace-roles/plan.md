# Plan 123: Renamespace de roles

## Estrategia

Renombrado atómico del vocabulario de roles en tres fases:

1. **Dominio y datos**: `schema.prisma` + migración SQL. Postgres soporta
   `ALTER TYPE "UserRole" RENAME VALUE` desde v10, que reescribe solo el
   catálogo, no las filas — seguro incluso con tablas grandes. El orden
   importa para evitar colisiones de nombres: primero
   `Administrador → Super_Administrador`, luego
   `Supervisor_Elevado → Administrador`.
2. **Código**: reemplazo mecánico con orden seguro. Se introduce un
   marcador temporal (`__ADMIN_OLD__`) para `Administrador` viejo durante
   el reemplazo y se elimina al final, evitando el solapamiento
   (viejo `Administrador` → nuevo `Super_Administrador` BEFORE nuevo
   `Administrador` ← `Supervisor_Elevado`).
3. **Contratos**: regenerar Prisma client, swagger y SDK frontend
   (`check:sdk`), actualizar pruebas al nuevo vocabulario y correr la
   validación completa.

## Archivos a tocar

| Objetivo                                                        | Modificación                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `backend/prisma/schema.prisma`                                  | Renombrar valores del enum `UserRole`                                  |
| `backend/prisma/migrations/<new>/migration.sql`                 | `ALTER TYPE ... RENAME VALUE` (generada con `--create-only`)           |
| `backend/src/**` (~32 archivos)                                 | Reemplazo de literal de rol en guards, servicios, schemas zod, openapi |
| `backend/prisma/seed.ts`, `backend/scripts/force_admin.ts`      | Seeds y utilidades admin                                               |
| `backend/tests/**` (~38 archivos)                               | Actualizar rol esperado en fixtures y asserts                          |
| `frontend/src/**` (~75 archivos)                                | Constantes, guards de ruta, badges, formularios, hooks                 |
| `frontend/e2e/**`                                               | Fixtures de roles                                                      |
| `backend/docs/swagger.json`, `frontend/src/types/api-schema.ts` | Regenerados por `check:sdk`                                            |
| `docs/adr/0034-renamespace-roles.md`, `docs/adr/README.md`      | Decisión y índice                                                      |

## Contratos afectados

- Sin cambios de rutas ni de shape HTTP: solo cambian los valores del
  enum `role` en payloads/responses (OpenAPI + SDK regenerados).
- `routeManifest` (`tests/fastify-integration/runtime.test.ts`) no cambia.

## Riesgos y rollback

- **Colisión de nombres durante el reemplazo**: mitigada con marcador
  temporal y orden secuencial; verificado con grep final
  (`Supervisor_Elevado` = 0 fuera de generated/migraciones).
- **Sesiones activas en dev/staging**: el renombre es compatible en vivo;
  los tokens JWT llevan `role` como string — tras deploy, sesiones viejas
  con rol `Administrador` antiguo se tratan como el nuevo
  `Super_Administrador` solo si coinciden por valor... en realidad el
  valor string cambió, por lo que las sesiones activas con rol viejo
  quedan inválidas y fuerzan re-login (aceptable, coincide con el flujo
  de `credentialStamp`).
- **Rollback**: revert de migración (renombre inverso) + revert de
  commit; sin datos destruidos.
