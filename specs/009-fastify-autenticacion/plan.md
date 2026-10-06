# SDD — Autenticación HTTP

## Contrato y límites

`modules/auth/application/flows.ts` orquesta mediante puertos de servicio,
throttle, auditoría y logger. AuthService conserva bcrypt, firma JWT, MFA y
persistencia; especialmente el advisory lock y trim en withDirectTransaction.
`services/authFlows.ts` compone las dependencias. Dos adaptadores HTTP delegan.
La entrada pública del módulo es index.ts. El chequeo estricto existente se extiende
por inclusión automática de nuevos archivos de auth.

Fastify registra auth dentro del rate-limit global y mantenimiento existentes.
La autenticación protegida ocurre en onRequest, antes de parsear el cuerpo.
El throttle necesita el cuerpo y se ejecuta en preHandler antes de Zod, como
Express. Véase [ciclo de hooks de Fastify](https://fastify.dev/docs/latest/Reference/Hooks/).
Setup y logout ignoran el cuerpo por diseño (ausente o cualquier JSON); el
contrato explícito z.unknown documenta esa excepción, sin exigir campos nuevos. El manifiesto enumera
exactamente seis rutas y distingue públicas/protegidas, con anti-vacuidad.

## Invariantes

- No cambiar respuestas ni normalización de roles. JWT lleva jti único.
- MFA pendiente dura 5 min y no crea sesión; Usuario conserva fallback 0.03 h;
  quiosco dura 5 min y conserva exención de sesión persistida.
- Logout sigue público e idempotente; solo toma token del header, actor anónimo.
- Login archived produce 403; PIN falla cinco veces, luego blocked produce 403.
- Las transacciones de sesiones no se mueven al pool transaccional PgBouncer.
- No se modifica la política administrativa de purga ni emisión de sockets.
- La auditoría de error omite cuerpo en todas las rutas auth, no solo categoría
  AUTH_ERROR. Es una corrección explícita para no almacenar password/PIN/códigos.

## Comportamiento heredado por revisar aparte

AuthService.validateMFALogin no vuelve a rechazar rol Archivado después de la
primera fase; un desafío emitido antes de archivar sigue la política existente.
El contador de PIN usa lectura/incremento/escritura y no garantiza contar todas
las fallas concurrentes. El throttle es en memoria por proceso y MFA validate no
usa loginRateLimiter en Express. Estos cambios de seguridad requieren contrato
propio; no se alteran silenciosamente durante esta migración.
