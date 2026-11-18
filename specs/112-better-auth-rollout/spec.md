# Spec 112: Better-auth rollout — cierre y documentación

- Estado: Implementado
- Autor: MIA (cierre Fase 7)
- Fecha: 2026-11-18
- ADR relacionado: `docs/adr/0031-better-auth.md`

## Problema

La integración de better-auth (plan `.hermes/plans/2026-11-07_151750-better-auth-integration.md`)
llegó a staging con `BETTER_AUTH_ENABLED=true` pero quedó sin cerrar como decisión
arquitectónica: ADR-0031 en estado `Propuesto` con alternativas "descartadas" que en
la práctica ya se eligieron, 7 preguntas abiertas de Fase 0 sin respuesta escrita,
spec SDD inexistente (incumplimiento de la Constitución V), y sin verificación de
los comandos de gobernanza (`spec:check`, `docs:check`, `lint:budget`) sobre el
estado final.

## Alcance

Dentro:

- Promover ADR-0031 a `Aceptado` con las 6 decisiones reales (username, Bearer,
  speakeasy, kiosco fuera, bcryptjs, dual-read de sesiones).
- Crear `specs/112-better-auth-rollout/` con spec/plan/tasks trazables.
- Verificar `prisma migrate status` up to date y dry-run del script de migración.
- Correr `validate:ci` backend + frontend, `docs:check`, `spec:check`, `lint:budget`.

Fuera (explícito):

- Migrar MFA a `twoFactor` de better-auth (requiere test de paridad de lockout,
  queda para spec propio).
- Aplicar `migrate-users-to-better-auth.ts --apply` en staging con datos reales
  (paso de despliegue, no de este spec).
- Deprecar `ActiveSession` / quitar `jsonwebtoken` (Fase 7 de limpieza, requiere
  flag único en prod 1 semana).
- Cambiar transporte a cookie HttpOnly.

## Criterios de aceptación

- [x] AC1: `docs/adr/0031-better-auth.md` tiene `Estado: Aceptado` y registra las 6 decisiones reales con referencias a archivo:línea.
- [x] AC2: `specs/112-better-auth-rollout/` existe con `spec.md`, `plan.md`, `tasks.md` y pasa `npm run spec:check`.
- [x] AC3: `npx prisma migrate status` muestra `up to date` incluyendo `20261107090000_add_better_auth` y `20261107100000_add_two_factor`.
- [x] AC4: `npx tsx scripts/migrate-users-to-better-auth.ts --dry-run` termina sin writes (salida "dry-run").
- [x] AC5: `cd backend && npm run validate:ci` termina 0 errors / 0 warnings de lint.
- [x] AC6: `cd frontend && npm run validate:ci` termina 0 errors.
- [x] AC7: `npm run docs:check` (raíz) → OK.
- [x] AC8: `npm run lint:budget` (raíz) → 0/0.
- [x] AC9: `grep -r "Kiosk_Employee" backend/src` sigue devolviendo hits (kiosco no tocado).
- [x] AC10: `grep -rn "BETTER_AUTH_ENABLED" backend/src` muestra dual-mode en authenticate, routes, app, socketAuthentication, authentication.

## Restricciones

- Constitución I: el contrato HTTP legacy `/api/auth/*` no cambia; dual-mode por flag.
- Constitución II: DDL y migraciones solo con `DIRECT_URL`; adapter Prisma recibe client directo.
- Constitución III: `BETTER_AUTH_SECRET` solo vía `requireEnv` fail-fast; ningún fallback débil.
- Constitución IV: ratchet 0/0 de warnings; cero `any` en `backend/src`.
- Constitución V: este spec existe antes de promover el ADR y cerrar el plan.
- Rollback: poner `BETTER_AUTH_ENABLED=false` devuelve al modo JWT legacy sin tocar datos.

## Trazabilidad

- Tests que lo probaron: `backend/tests/unit/betterAuthSchema.test.ts`,
  `betterAuthSessionAdapter.test.ts`, `betterAuthPasswordCompat.test.ts`,
  `tests/unit/authFlows.test.ts`, `tests/unit/socketAuthentication.test.ts`,
  `tests/fastify-integration/auth.test.ts` (709 tests unitarios verdes).
- Docs a actualizar: `docs/adr/0031-better-auth.md`, `docs/adr/README.md`,
  `specs/112-better-auth-rollout/*`, `.hermes/plans/2026-11-07_151750-better-auth-integration.md` (estado).
