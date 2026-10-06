# ADR-0019: Estado persistente para intentos MFA y PIN

- Estado: Aceptado
- Fecha: 2026-10-06
- Autores: equipo y Codex

## Contexto

La migración HTTP de auth conservó tres riesgos heredados: no revalidar archivo
entre factores, MFA sin límite de códigos y pérdida de incrementos PIN concurrentes.
El equipo autorizó corregirlos antes de migrar usuarios y empleados.

## Decisión

Persistir el límite MFA en usuarios: cinco fallos en cinco minutos bloquean
cinco minutos. La clave es la identidad de un JWT pendiente verificado, no IP
ni token completo. Un nuevo desafío no evade el bloqueo. Solo el código válido
sin bloqueo vigente o vencimiento de ventana permite limpiar el estado.
El límite aplica igual en desarrollo y producción.

Leer rol actual, estado MFA y presupuesto dentro de una transacción directa con
bloqueo FOR UPDATE de users. Devolver el fallo dentro de la transacción para
confirmar el incremento antes de que el caso de uso lance 401. Rechazar archivo
con 403 y MFA no disponible con 401. Bloqueo vigente devuelve 429 y Retry-After.

En PIN, bloquear la fila employees antes de leer, verificar y modificar estado.
Así los cinco fallos y el bloqueo permanente existente se serializan. La
transacción directa conserva contexto de auditoría y compatibilidad contractual
con PgBouncer en modo transaction.

## Consecuencias

PostgreSQL coordina MFA entre procesos sin incorporar Redis ni otra dependencia.
Hay tres columnas aditivas y una restricción de contador entre cero y cinco.
La migración debe aplicarse antes de ejecutar el código nuevo; el cliente Prisma
se regenera. La suite aplica la migración sobre PostgreSQL 18.4 desechable.

Se incorpora una lectura de bloqueo por intento y las solicitudes de una misma
identidad esperan su turno. No se afirma mejora de rendimiento. bcrypt PIN sigue
siendo síncrono como antes. El bloqueo temporal puede impedir también al titular
completar MFA; el TTL acota esa indisponibilidad.

La creación de sesión continúa en su transacción existente, separada de la
validación MFA. Uso único del desafío/TOTP y atomicidad de todo el ciclo de sesión
quedan fuera de alcance. El throttle de login conserva su almacenamiento en memoria.

El estado nuevo se omite de payloads UserService HTTP/sockets. La proyección pública
heredada de usuarios se corrige después en [spec 011](../../specs/011-usuarios-dto-publico/result.md)
mediante select y lista positiva, conservando MFA público y flags de contraseña.

## Evidencia

[Spec 010](../../specs/010-auth-seguridad/spec.md),
[SDD](../../specs/010-auth-seguridad/plan.md),
[BDD](../../specs/010-auth-seguridad/behavior.md) y
[resultado](../../specs/010-auth-seguridad/result.md).
