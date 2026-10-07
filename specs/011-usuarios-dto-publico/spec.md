# Spec 011 — DTO públicos de usuarios

Estado: Implementado — validado localmente.

## PRD

Eliminar passwordHash, mfaSecret y estado interno de seguridad de respuestas
HTTP y eventos user:updated. Aplica a listado/paginación, alta, actualización y
creación/reuso de usuarios vinculados a empleados. Usar lista positiva que no
exponga nuevas columnas futuras por accidente.

Conservar identidad, rol normalizado, vínculo, fechas, estado público MFA y
mustChangePassword. El flag interno isForcePasswordChange se representa únicamente
como mustChangePassword, también al crear. Metadata de sync sigue en listados;
el evento de eliminación mantiene su tombstone. No cambian contraseñas guardadas,
reglas de acceso, auditoría, filtros ni formato de paginación. No migra todavía
las rutas users a Fastify ni cambia datos/esquema PostgreSQL.

## Criterios de aceptación

- [x] AC1: Todas las salidas de usuarios omiten credenciales y contadores, incluso columnas futuras simuladas en mocks.
- [x] AC2: Alta/actualización/ensure emiten exclusivamente DTO público; reuso no duplica ni emite; borrado conserva tombstone.
- [x] AC3: HTTP real y PostgreSQL verifican listado, paginación, contraseña usable y secreto MFA conservado en BD.
- [x] AC4: API pública users/index.ts, proyección pura, select Prisma positivo, strict y guard no vacuo.
- [x] AC5: OpenAPI User estricto incluye mfaEnabled y roles normalizados; SDK/snapshots sincronizados; gates pasan sin elevar ratchets.
