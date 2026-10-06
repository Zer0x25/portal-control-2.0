# SDD

La aplicación auth continúa sin imports de infraestructura. AuthService verifica
JWT pendiente y usuario actual; PostgreSQL es la fuente del límite MFA.
Tres columnas nuevas: mfaFailedAttempts (0), mfaFailureWindowStartedAt (nullable),
mfaBlockedUntil (nullable). Ventana y bloqueo: 300 segundos; límite: cinco fallos.

withDirectTransaction usa DIRECT_URL. SELECT id FOR UPDATE parametrizado en
users serializa lectura, elegibilidad, verificación TOTP y actualización de estado.
El fallo devuelve resultado dentro de la transacción para confirmar el contador;
la aplicación lanza 401 después. Nunca lanzar por código incorrecto dentro de
la transacción: desharía el incremento. Bloqueo vigente lanza error operacional
429 con Retry-After, sin mutación. Un JWT firmado sin mfaPending true o identidad
string no puede acceder al contador. No se persisten códigos ni tokens.

La fila employees se bloquea con FOR UPDATE antes de leer y comparar PIN;
lectura, incremento/bloqueo o reset se confirman juntos. Los bloqueos de fila
coordinan también actualizaciones administrativas normales. No hay N+1.

RateLimitError y el mapper HTTP compartido suministran el mismo header a ambos
adaptadores. OpenAPI añade respuestas 401/403/429 y el SDK se regenera. Los
contadores internos no se agregan a DTO públicos. Creación de sesión mantiene
su transacción existente; no se vuelve atómico todo el ciclo MFA/sesión.
