# BDD — Ejemplos de autenticación

- B1: Dadas credenciales válidas, login entrega DTO y JWT; existe hash de sesión y LOGIN_SUCCESS.
- B2: Dada contraseña inválida, devuelve 401 y registra LOGIN_FAILED; archived devuelve 403 sin sesión.
- B3: Dado MFA enabled, login entrega desafío de 5 min sin sesión; código correcto crea sesión y LOGIN_MFA_SUCCESS.
- B4: Dado código incorrecto o JWT pendiente expirado, no crea sesión; setup protegido produce QR, verify habilita MFA.
- B5: Dado token revocado o sesión expirada, ruta protegida devuelve 401; logout repetido siempre 200.
- B6: Dados tres logins concurrentes de Usuario, JWT son distintos y queda una sesión; TTL conserva 108 s.
- B7: Dado PIN válido, token de quiosco dura 300 s; cinco fallas bloquean y acceso posterior devuelve 403.
- B8: Dadas fallas hasta el límite por IP/identidad, siguiente login devuelve 429 con Retry-After; otra identidad queda separada.
- B9: Dado fallo inesperado en auth con contraseña/PIN/código en cuerpo, auditoría conserva contexto sin credenciales.
- B10: Dado enumerador vacío, rutas faltantes, pública marcada privada o mutación sin validación, guard falla.

TDD de orquestación: 13 pruebas rojas con stub antes de implementación;
registro local /tmp/portal-009-red.log y /tmp/portal-009-green.log.
