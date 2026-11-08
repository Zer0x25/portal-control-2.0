# ADR-0031: Integrar better-auth como autoridad de sesiones de usuario

- Estado: Propuesto
- Fecha: 2026-11-07
- Autores: MIA (implementación Fase 0-1)

## Contexto

El sistema actual usa JWT custom con `jsonwebtoken` + `bcryptjs` + tablas `users` / `active_sessions` y MFA con `speakeasy` (`backend/src/services/AuthService.ts`). Se necesita una librería de auth mantenida para delegar gestión de sesiones, contraseñas y MFA. Restricciones: Fastify como único servidor HTTP, PgBouncer en `POOL_MODE: transaction` con `withDirectTransaction` para toda transacción interactiva (`backend/src/services/db.ts`), Prisma 7 con imports desde `backend/src/generated/prisma/client`, contrato público en `/api/auth/*` y flujo PIN de kiosco para empleados sin usuario.

## Decisión

Integrar better-auth de forma incremental (strangler fig) bajo flag `BETTER_AUTH_ENABLED` (default `false`). Reutilizar el modelo `User` existente y extenderlo con `email` (nullable), `name`, `emailVerified`, `image`; crear tablas `Session`, `Account`, `Verification` según `backend/prisma/schema.prisma`. Mantener el flujo `Kiosk_Employee` (PIN de empleado, token 5 min) fuera de better-auth. Mantener `speakeasy` en Fase 1; migrar a `twoFactor` de better-auth solo tras test de paridad de lockout. Fase 1 usa Bearer (`Authorization: Bearer`) para compatibilidad con `frontend/src/services/authToken.ts`; cookie HttpOnly queda como fase opcional.

## Alternativas consideradas

1. Reemplazo total inmediato (borrar `AuthService`, `ActiveSession`, JWT) — descartada porque rompe contrato, kiosco, sockets y auditoría sin red de seguridad.
2. Email como identificador primario desde el día 1 — descartada porque usuarios existentes tienen `username` y `email` nullable; obligaría a migración masiva de datos antes de validar better-auth.
3. Cookie HttpOnly desde el día 1 — descartada porque `frontend/src/services/apiClient.ts` usa Bearer + `sessionStorage` y CORS actual es `credentials: false` en `backend/src/platform/fastify/app.ts`; requiere cambio coordinado frontend/backend.

## Consecuencias

Positivas:

- Sesiones, verificación y cuentas gestionadas por librería mantenida.
- Compatibilidad de hashes `bcryptjs` (`$2a$`/`$2b$`) vía `password.hash/verify` custom en `backend/src/modules/auth/infrastructure/betterAuth.ts` (fábrica `createAuth(prisma)` con inyección, sin import de `services/db` dentro de `src/modules` para respetar `tsconfig.modules.json` estricto).

Negativas / costos aceptados:

- Duplicación temporal de sesiones (`ActiveSession` legacy vs `Session` de better-auth) hasta deprecation en Fase 7.
- DOS implementaciones MFA vivas por ~1 mes (speakeasy + twoFactor).
- Migración de usuarios (`scripts/migrate-users-to-better-auth.ts`) pendiente hasta Fase 3 (dry-run).

## Referencias

- `backend/prisma/schema.prisma` — `User` extendido + `Session`/`Account`/`Verification`.
- `backend/src/modules/auth/infrastructure/sessionAdapter.ts` — duraciones/límites por rol.
- `backend/src/modules/auth/infrastructure/betterAuth.ts` — `createAuth(prisma)`.
- `.hermes/plans/2026-11-07_151750-better-auth-integration.md` — plan completo por fases.
