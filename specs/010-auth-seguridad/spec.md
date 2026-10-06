# Spec 010 — Seguridad de MFA y PIN

Estado: Implementado — validado localmente.

## PRD

Cerrar tres riesgos heredados de autenticación antes de ampliar la migración.
Express y Fastify comparten las correcciones. El usuario archivado entre factores
recibe 403; MFA deshabilitado o sin secreto recibe 401. Cinco códigos incorrectos
en una ventana de cinco minutos bloquean al usuario durante cinco minutos.
Un nuevo desafío o cambio de IP no reinicia el bloqueo. El sexto intento recibe
429 y Retry-After; los cinco fallidos previos reciben 401. Un código válido limpia
el contador si no hay bloqueo vigente. El PIN conserva su bloqueo permanente al
quinto fallo y sus respuestas actuales; los intentos simultáneos se serializan.

Incluye migración aditiva de estado MFA en usuarios. No cambia el servidor
principal, duración de JWT, SDK de login ni política de PIN predeterminado.
El throttle de login existente sigue siendo por proceso; MFA usa PostgreSQL.

## Criterios de aceptación

- [x] AC1: Usuario archivado entre factores recibe 403 sin sesión ni auditoría de éxito; MFA deshabilitado recibe 401.
- [x] AC2: Cinco fallos MFA concurrentes persisten exactamente cinco; el resto recibe 429 sin verificar códigos, con Retry-After, en ambos servidores.
- [x] AC3: El bloqueo sobrevive cambio de IP/desafío; otra identidad no queda bloqueada; bloqueo y ventana vencidos permiten reintentar.
- [x] AC4: MFA válido limpia estado y crea sesión usando el rol actual; JWT inválido/expirado no consume intentos.
- [x] AC5: PIN concurrente produce intentos 1–5 sin pérdidas, bloqueo persistido y ninguna emisión posterior de token.
- [x] AC6: Transacciones directas, tipos estrictos, contratos/SDK, cobertura y gates pasan sin elevar ratchets.
