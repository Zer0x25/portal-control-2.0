# Spec 012 — Usuarios en Fastify

Estado: Implementado — validado localmente.

## PRD

Migrar GET/POST /api/users y PUT/DELETE /api/users/:id al candidato Fastify.
Compartir casos de uso con Express, aislando reglas de cuentas del transporte y
Prisma para facilitar mantenimiento y desarrollo guiado por contratos y pruebas.
Express sigue como servidor principal. React, Vite, PostgreSQL y Node 26 continúan.

## Criterios de aceptación

- [x] AC1: Cuatro rutas Fastify con autenticación real y rol Administrador persistido, comprobadas contra Express.
- [x] AC2: Casos de uso puros con repositorio, hash, identificador, auditoría y eventos inyectados; consumidores por index.ts y tipos estrictos.
- [x] AC3: Filtros, paginación, contraseñas, flags, vínculo/desvínculo, conflictos, eliminación y DTO público conservan comportamiento.
- [x] AC4: PostgreSQL desechable valida ambos transportes; guard no vacuo exige rutas, autenticación y validación.
- [x] AC5: Tipos, formato, lint, SDK, cobertura, documentación y pruebas pasan sin elevar ratchets.
