# BDD 008: Comportamientos observables

Spec: [spec.md](./spec.md).

- B1: JWT válido y sesión vigente permiten GET; ausente/inválido/expirado/revocado devuelven 401.
- B2: rol persistido Usuario permite lectura pero bloquea creación, bulk, sync y delete con 403, sin efectos.
- B3: supervisor crea con 201, bulk devuelve count con 201, sync devuelve total/year con 200, delete devuelve 204 vacío.
- B4: body inválido devuelve VALIDATION_ERROR y no escribe; proveedor inválido no escribe ninguna fila.
- B5: dos peticiones concurrentes de actores diferentes mantienen su actor a través de await y registran auditoría correcta.
- B6: mantenimiento bloquea feriados con 503; health sigue respondiendo y readiness devuelve 503 si BD falla.
- B7: límite de peticiones devuelve 429; health sigue disponible; payload excedido devuelve 413.
- B8: fallo Prisma conserva mapping 404/409/503; error inesperado se audita con metadata de la petición.
- B9: cerrar la app llama cierre de recursos una vez, sin jobs ni sockets al importar/construir.

## Trazabilidad

| Ejemplos    | Pruebas                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------- |
| B1/B2       | `tests/unit/authentication.test.ts`, `tests/unit/fastifyApp.test.ts`                     |
| B3/B4       | `tests/unit/holidays/commands.test.ts`, `tests/fastify-integration/holidays.test.ts`     |
| B5          | `tests/unit/fastifyApp.test.ts`, trigger de `tests/fastify-integration/holidays.test.ts` |
| B6/B7/B8/B9 | `tests/unit/fastifyApp.test.ts`, `tests/fastify-integration/holidays.test.ts`            |

Los paths de pruebas son relativos a backend. El caso de uso mantiene además
los ejemplos B1–B6 de spec 006 y su caracterización Express.
