# Spec 025: Fastify como servidor principal

- Estado: Completada y validada en desarrollo
- Fecha: 2026-10-07
- Ruta: [roadmap](../roadmap-fastify.md)

## Problema

Todos los módulos ya tienen adaptadores Fastify, pero el arranque por defecto
sigue usando Express. Se estaba confundiendo la migración con preparación para
producción, agregando bloqueantes que no corresponden al entorno de desarrollo.

## Alcance y decisión

Por instrucción del usuario, cerrar la migración existente en desarrollo. Fastify
es el servidor por defecto en npm run dev, npm start y los compose. Conservar
React/Vite, Node 26, PostgreSQL, contratos HTTP/SDK, sockets y jobs. Express queda
solo como fixture de comparación/rollback local, fuera de dependencias runtime
y de la imagen final. No crear nuevos specs de migración para deudas heredadas.

Se permite purgar sesiones y reiniciar en desarrollo. Drenaje universal, operación
sin interrupciones y deudas de negocio pasan a [backlog](backlog.md), no bloquean
el cambio de framework. No bajar ratchets ni ocultar errores de pruebas.

## Criterios de aceptación

- [x] AC1: Inventario no vacío de rutas Fastify, autenticación y validación, con SDK sincronizado.
- [x] AC2: BDD y RED real del arranque/dependencias antes del cambio; conservar pruebas de comportamiento.
- [x] AC3: Entrypoint Fastify por defecto, contratos/puertos estrictos y dependencias Express fuera del runtime.
- [x] AC4: Integración con BD aislada, gateway/PgBouncer, UI y ciclo de vida del servidor comprobados.
- [x] AC5: Gates backend/frontend secuenciales, docs/SDK y ratchets; resultado con rollback verificable y límites de medición.

## Contratos conservados

Socks requieren JWT/sesión; autorización por rol/empleado y proyecciones privadas.
SMTP HTTP enmascarado, auditorías redactadas y errores 5xx genéricos. Reset de BD
es transaccional y conserva credenciales Admin; reset de contraseña revoca sesiones
del destino y bloquea login/MFA previo mediante prueba opaca de credenciales.
MFA conserva presupuesto persistido, locks y rol actual. No cambiar defaults
criptográficos, permisos, duración JWT ni límites de carga como parte del cutover.

Inventario: [routes.json](routes.json). Ejemplos: [behavior.md](behavior.md).
Implementación: [plan.md](plan.md). Evidencia e historia: [result.md](result.md).
