# Spec 123: Renamespace de roles

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-11-27
- ADR relacionado: `docs/adr/0034-renamespace-roles.md`

## Problema

La taxonomía actual de `UserRole` mezcla un rol técnico (`Administrador`,
reservado hoy a desarrollo/operación interna) con el rol que el cliente
final entiende por "administrador" (`Supervisor_Elevado`). Esto genera
fricción semántica: el cliente pide "administrador" y recibe un rol con
otro nombre, mientras el rol reservado a desarrollo lleva el nombre que
el cliente espera usar.

Evidencia: enum `UserRole` en `backend/prisma/schema.prisma` (7 valores);
121 usuarios en la base de desarrollo usan los valores actuales.

## Alcance

Dentro:

- Renombrar valores del enum `UserRole` en PostgreSQL y `schema.prisma`.
- Actualizar todas las referencias de rol en backend, frontend, seeds,
  scripts, swagger y SDK generado.
- Migración de datos idempotente que renombra los valores existentes.

Fuera (explícito):

- Cambiar permisos de cualquier rol (el mapeo es 1:1 en capacidad).
- Añadir o quitar roles (`Fiscalizador`, `Archivado` se mantienen).
- Desplegar a staging/producción (eso lo hace el pipeline normal).

## Criterios de aceptación

- [x] AC1: `schema.prisma` declara `Super_Administrador`, `Administrador`
      (ex `Supervisor_Elevado`), `Supervisor`, `Reloj_Control`,
      `Fiscalizador`, `Usuario`, `Archivado`; la migración SQL usa
      `ALTER TYPE ... RENAME VALUE` sin reescribir filas de usuarios.
- [x] AC2: Los usuarios existentes conservan su capacidad exacta: quien
      era `Administrador` queda `Super_Administrador`, quien era
      `Supervisor_Elevado` queda `Administrador`.
- [x] AC3: Backend y frontend compilan sin referencias a
      `Supervisor_Elevado` y sin usos residuales del significado antiguo de
      `Administrador` fuera de `src/generated` y migraciones históricas.
- [x] AC4: Swagger y SDK frontend regenerados y sincronizados
      (`npm run check:sdk` verde).
- [x] AC5: `npm run validate:ci` verde en backend y frontend;
      `spec:check`, `docs:check` y lint budget 0/0.

## Restricciones

- Constitución II: migración vía Prisma con `DIRECT_URL`, inspección del
  SQL antes de aplicar (runbook prisma-migration-safeguard).
- Constitución IV: ratchets en 0; sin `any` nuevo.
- Rollback: migración reversible (renombre inverso); código revertible
  por commit.

## Trazabilidad

- Tests que lo prueban: suites existentes de backend
  (`tests/unit`, `tests/fastify-integration`) y frontend (`src/tests`)
  actualizadas al nuevo vocabulario; snapshot de swagger.
- Docs a actualizar: `docs/adr/0034-renamespace-roles.md`,
  índice `docs/adr/README.md`.
