-- Spec 123 / ADR-0034: renamespace de roles.
-- RENAME VALUE solo toca el catalogo de PostgreSQL (no reescribe filas).
-- Orden importa: primero liberar el nombre "Administrador" antes de
-- reutilizarlo para el ex Supervisor_Elevado.

-- Desarrollador: Administrador -> Super_Administrador
ALTER TYPE "UserRole" RENAME VALUE 'Administrador' TO 'Super_Administrador';

-- Cliente final: Supervisor_Elevado -> Administrador
ALTER TYPE "UserRole" RENAME VALUE 'Supervisor_Elevado' TO 'Administrador';
