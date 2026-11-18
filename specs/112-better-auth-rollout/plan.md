# Plan 112: Better-auth rollout — cierre y documentación

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

Cerrar la integración better-auth como decisión arquitectónica aceptada, sin código
nuevo: documentar las decisiones ya implementadas, verificar el estado real con los
comandos de gobernanza y dejar trazabilidad SDD completa.

1. Leer el plan por fases y el estado real del código (flags, dual-mode, staging).
2. Reescribir ADR-0031 a `Aceptado` con las 6 decisiones reales y referencias archivo:línea.
3. Scaffold `specs/112-better-auth-rollout/` con `npm run spec:new`; rellenar spec/plan/tasks.
4. Verificar esquema: `prisma migrate status` + dry-run del script de migración.
5. Índice de ADRs: fila 0031 a `Aceptado`.
6. QA completo: `validate:ci` backend y frontend, `docs:check`, `spec:check`, `lint:budget`.

## Archivos a tocar

| Archivo                                  | Cambio                                                      |
| ---------------------------------------- | ----------------------------------------------------------- |
| `docs/adr/0031-better-auth.md`           | Estado `Aceptado`, decisiones reales, sección cierre Fase 7 |
| `docs/adr/README.md`                     | Fila 0031 → Aceptado                                        |
| `specs/112-better-auth-rollout/spec.md`  | Creado (AC1-AC10)                                           |
| `specs/112-better-auth-rollout/plan.md`  | Creado                                                      |
| `specs/112-better-auth-rollout/tasks.md` | Creado con checkboxes ejecutables                           |

## Contratos afectados

Ninguno. Es documentación y verificación sobre código ya mergeado en `main`
(commits `89414d4`..`3bfa24b`). No se toca `swagger.json`, SDK, schema.prisma ni rutas.

## Riesgos y rollback

- Riesgo: documentar decisiones que el código no cumple. Mitigación: cada AC tiene
  comando verificable y se ejecuta antes de marcar `[x]`.
- Rollback: `git checkout` de los 5 archivos; cero impacto en runtime.

## Verificación

```bash
cd backend && npx prisma migrate status
cd backend && npx tsx scripts/migrate-users-to-better-auth.ts --dry-run
cd backend && npm run validate:ci
cd ../frontend && npm run validate:ci
cd .. && npm run docs:check && npm run spec:check && npm run lint:budget
grep -r "Kiosk_Employee" backend/src | wc -l
```
