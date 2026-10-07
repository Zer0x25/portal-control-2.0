# BDD

- B1: Dado desafío válido, cuando se archiva la cuenta antes del segundo factor, entonces 403 y cero sesiones en Express y Fastify.
- B2: Dado MFA deshabilitado tras emitir desafío, cuando se envía código, entonces 401 sin sesión.
- B3: Dados ocho códigos incorrectos simultáneos para la misma identidad, entonces cinco 401, tres 429, contador cinco y bloqueo persistido.
- B4: Dado bloqueo, cuando cambia IP o se emite otro desafío, entonces 429 con Retry-After; otra cuenta puede completar MFA.
- B5: Dado bloqueo vencido o ventana vencida, cuando se falla, entonces comienza un contador de uno; un código válido limpia estado.
- B6: Dado JWT inválido/expirado, entonces 401 sin tocar contadores; un código válido usa el rol actual.
- B7: Dados ocho PIN incorrectos simultáneos, entonces intentos 1–5, tres 403 y fila bloqueada con contador cinco; PIN correcto posterior tampoco emite token.
- B8: Dados fallos PIN previos, cuando PIN correcto gana la transacción, entonces contador cero y respuesta habitual.
