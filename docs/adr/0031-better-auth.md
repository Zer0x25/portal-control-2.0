# ADR-0031: Integrar better-auth como autoridad de sesiones de usuario

- Estado: Aceptado
- Fecha: 2026-11-07
- Autores: MIA (implementación Fases 1-6), usuario (cierre Fase 7)

## Contexto

El sistema actual usa JWT custom con `jsonwebtoken` + `bcryptjs` + tablas `users` /
`active_sessions` y MFA con `speakeasy` (`backend/src/services/AuthService.ts`).
Se necesita una librería de auth mantenida para delegar gestión de sesiones,
contraseñas y cuentas. Restricciones: Fastify como único servidor HTTP, PgBouncer en
`POOL_MODE: transaction` con `withDirectTransaction` para toda transacción interactiva
(`backend/src/services/db.ts`), Prisma 7 con imports desde
`backend/src/generated/prisma/client`, contrato público en `/api/auth/*` y flujo PIN
de kiosco para empleados sin usuario.

## Decisión

Integrar better-auth de forma incremental (strangler fig) bajo flag
`BETTER_AUTH_ENABLED` (default `false` en dev, `true` ya en staging vía
`.env.staging`). Las decisiones abiertas del plan
`.hermes/plans/2026-11-07_151750-better-auth-integration.md` quedaron así:

1. **Identificador primario = `username`**. better-auth usa `email` nativo; se
   reutiliza el `User` existente (sin modelo paralelo) extendido con `email`
   nullable, `name`, `emailVerified`, `image` (`backend/prisma/schema.prisma`).
   `username` se declara como `additionalField` de entrada en `createAuth` y el
   email se rellena oportunistamente (`email ?? username@portal.local`) en
   `scripts/migrate-users-to-better-auth.ts`.
2. **Transporte = Bearer, no cookie**. Plugin `bearer()` activo
   (`backend/src/modules/auth/infrastructure/betterAuth.ts:39`); el frontend sigue
   en `sessionStorage["authToken"]` + `Authorization: Bearer` y CORS permanece
   `credentials: false`. Cookie HttpOnly queda descartada para esta iteración.
3. **MFA se queda en `speakeasy` + tabla `TwoFactor` propia** (`schema.prisma:103`).
   El plugin `twoFactor` de better-auth está instalado pero NO se usa para el flujo
   legacy; migrar MFA requiere primero el test de paridad de lockout
   (5 intentos / bloqueo 5 min, `AuthService.validateMFALogin`), pendiente.
4. **Kiosco fuera de better-auth**. `Kiosk_Employee` (PIN de empleado, token 5 min,
   sin fila en `ActiveSession`) no toca better-auth; allowlist y `verifyKioskPin`
   intactos (`grep -r "Kiosk_Employee" backend/src` = 9 archivos).
5. **Hashes compatibles**: `password.hash/verify` con `bcryptjs` en better-auth,
   sin re-hash masivo ni reset de contraseñas.
6. **Sesiones dual-read durante transición**: `socketAuthentication.ts` resuelve
   `ActiveSession` legacy y `Session` de better-auth en 2 batch queries según flag;
   `ActiveSession` se deprecará cuando el flag sea único en prod.

## Alternativas consideradas

1. Reemplazo total inmediato (borrar `AuthService`, `ActiveSession`, JWT) —
   descartada porque rompe contrato, kiosco, sockets y auditoría sin red de seguridad.
2. Email como identificador primario desde el día 1 — descartada porque usuarios
   existentes tienen `username` y `email` nullable; obligaría migración masiva de
   datos antes de validar better-auth.
3. Cookie HttpOnly desde el día 1 — descartada porque `apiClient.ts` usa Bearer +
   `sessionStorage` y CORS actual es `credentials: false`; requiere cambio
   coordinado frontend/backend sin ganancia funcional en esta iteración.
4. Migrar MFA al plugin `twoFactor` en el mismo rollout — descartada porque la
   lógica de lockout (`mfaFailedAttempts` / `mfaBlockedUntil`) es custom y auditada;
   solo se migrará tras test de paridad verde.

## Consecuencias

Positivas:

- Sesiones, verificación y cuentas gestionadas por librería mantenida, con el
  contrato HTTP legacy intacto en dual-mode (`backend/src/modules/auth/application/authenticate.ts`,
  `backend/src/platform/fastify/app.ts:268`).
- Compatibilidad de hashes `bcryptjs` vía `password.hash/verify` custom en
  `createAuth(prisma)` con inyección (sin import de `services/db` dentro de
  `src/modules`, respetando `tsconfig.modules.json` estricto).
- Staging ya opera con `BETTER_AUTH_ENABLED=***

Negativas / costos aceptados:

- Duplicación temporal de sesiones (`ActiveSession` legacy vs `Session` de
  better-auth) hasta deprecation en Fase 7.
- Dos implementaciones MFA vivas: `speakeasy` productivo + plugin `twoFactor`
  instalado pero inactivo.
- `jsonwebtoken` y `speakeasy` siguen en `backend/package.json` mientras el modo
  legacy esté disponible (flag `false` en dev).

## Estado de cierre (Fase 7)

- Migración de esquema aplicada: `prisma migrate status` = up to date
  (`20261107090000_add_better_auth`, `20261107100000_add_two_factor`).
- `scripts/migrate-users-to-better-auth.ts` verificado en dry-run (0 writes);
  `--apply` solo se ejecuta en staging con datos reales.
- Especificación de cierre: `specs/112-better-auth-rollout/`.
- QA completo: `npm run validate:ci` backend + frontend, `npm run docs:check`,
  `npm run spec:check`, `npm run lint:budget`.

## Referencias

- `backend/prisma/schema.prisma` — `User` extendido + `Session`/`Account`/`Verification`/`TwoFactor`.
- `backend/src/modules/auth/infrastructure/betterAuth.ts` — `createAuth(prisma)` con bcryptjs + `bearer()` + `twoFactor()`.
- `backend/src/modules/auth/infrastructure/sessionAdapter.ts` — duraciones/límites por rol.
- `backend/src/platform/fastify/app.ts:264` — handler better-auth bajo flag.
- `backend/src/services/socketAuthentication.ts` — dual-read legacy + better-auth en 2 batches.
- `backend/scripts/migrate-users-to-better-auth.ts` — migración idempotente de `Account`.
- `frontend/src/services/authService.ts` — dual-mode `VITE_BETTER_AUTH_ENABLED`.
- `.hermes/plans/2026-11-07_151750-better-auth-integration.md` — plan completo por fases.
