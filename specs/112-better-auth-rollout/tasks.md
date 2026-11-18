# Tareas 112: Better-auth rollout — cierre y documentación

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

- [x] T1: Promover `docs/adr/0031-better-auth.md` a `Aceptado` con las 6 decisiones reales (username, Bearer, speakeasy, kiosco fuera, bcryptjs, dual-read) y referencias archivo:línea (AC1)
- [x] T2: Scaffold `specs/112-better-auth-rollout/` vía `npm run spec:new better-auth-rollout` y rellenar spec/plan/tasks (AC2)
- [x] T3: Verificar `npx prisma migrate status` = up to date con `add_better_auth` + `add_two_factor` (AC3)
- [x] T4: Verificar `npx tsx scripts/migrate-users-to-better-auth.ts --dry-run` sin writes (AC4)
- [x] T5: Actualizar fila 0031 de `docs/adr/README.md` a `Aceptado` (AC1, AC7)
- [x] T6: Correr `npm run validate:ci` backend → 0 errors, 0 warnings (AC5)
- [x] T7: Correr `npm run validate:ci` frontend → 0 errors (AC6)
- [x] T8: Correr `npm run docs:check` + `npm run spec:check` + `npm run lint:budget` en raíz (AC7, AC8, AC2)
- [x] T9: Verificar `grep -r "Kiosk_Employee" backend/src` con hits y `grep -rn "BETTER_AUTH_ENABLED" backend/src` dual-mode (AC9, AC10)
- [ ] T10: (Futuro, fuera de alcance) test de paridad MFA lockout antes de migrar a `twoFactor`
- [ ] T11: (Futuro, fuera de alcance) `migrate-users-to-better-auth.ts --apply` en staging con datos reales
- [ ] T12: (Futuro, fuera de alcance) deprecar `ActiveSession` + quitar `jsonwebtoken` con flag único en prod
