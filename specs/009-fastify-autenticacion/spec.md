# Spec 009 — Autenticación HTTP en Fastify

Estado: Implementado — autenticación HTTP del candidato.

## PRD

El candidato debe iniciar y cerrar sesiones sin depender del servidor Express.
Se migran las seis rutas de `/api/auth`: login, kiosk-login, logout, mfa/setup,
mfa/verify y mfa/validate. Se conserva el contrato público y se comparte la
orquestación con Express para evitar dos implementaciones de negocio.

Sesiones incluye creación, rotación, límite concurrente, caducidad y revocación.
El endpoint administrativo purge-sessions, jobs y sockets pertenecen a módulos
posteriores. Express sigue siendo principal. No se cambia el esquema ni el SDK.

## Criterios de aceptación

- [x] AC1: Las seis rutas reales aparecen en el manifiesto; setup y verify requieren autenticación; ninguna mutación carece de contrato de validación.
- [x] AC2: Login válido/inválido/archivado y MFA conservan cuerpos, códigos y auditoría de Express.
- [x] AC3: Login y quiosco comparten el throttle por IP e identidad normalizada; 429 conserva Retry-After y cuerpo.
- [x] AC4: PostgreSQL real comprueba sesión, límite concurrente, revocación, TTL Usuario y quiosco, MFA y bloqueo de PIN.
- [x] AC5: Casos de uso estrictos sin imports de servidor, BD, entorno ni reloj global; controladores Express delegan.
- [x] AC6: Credenciales no se guardan en auditoría de errores de auth, incluso ante fallos inesperados.
- [x] AC7: Gates de backend, frontend, contratos, docs y seguridad pasan sin elevar ratchets.
