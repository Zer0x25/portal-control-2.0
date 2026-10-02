# ADR-0001: Postgres 15 + PgBouncer en modo transacción con URL dual

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: retroactivo desde código

## Contexto

El backend usa Prisma contra PostgreSQL con cientos de conexiones
potenciales (`MAX_CLIENT_CONN` 300, pool 25 en `compose.yaml:25-52`).
PgBouncer en `POOL_MODE: transaction` rompe transacciones interactivas
y variables de sesión (`set_config` para auditoría). El cliente
extendido de Prisma tampoco tolera ese modo sin ayuda
(`backend/src/services/db.ts:7-47`, `AGENTS.md:113-115`).

## Decisión

Operar dos URLs:

- `DATABASE_URL`: vía PgBouncer para runtime (`compose.yaml:64`).
- `DIRECT_URL`: directa a `db:5432` para migraciones, seed y
  transacciones interactivas (`compose.yaml:65`).

Toda transacción interactiva o `set_config('audit.*')` usa
`withDirectTransaction()` de `backend/src/services/db.ts:32-47`,
nunca el pooler.

## Alternativas consideradas

1. Solo conexión directa — descartada porque no escala conexiones
   bajo carga de turnos y marcajes.
2. Solo PgBouncer en modo sesión — descartada porque retiene una
   conexión por cliente y anula el beneficio del pooler.

## Consecuencias

Positivas:

- Pool transaccional escala sin agotar Postgres.
- Auditoría por trigger (`audit.username`) sigue funcionando vía directa.

Negativas / costos aceptados:

- Dos clientes Prisma que mantener (`prisma`, `prismaDirect`).
- Todo contribuidor debe conocer la regla; violarla produce fallos
  sutiles de sesión.

## Referencias

- `compose.yaml:25-52` — servicios `db` y `pgbouncer`.
- `compose.yaml:64-65` — `DATABASE_URL` vs `DIRECT_URL`.
- `backend/src/services/db.ts:32-47` — `withDirectTransaction`.
- `AGENTS.md:113-115` — restricción obligatoria.
- `.jules/sentinel.md:6-9` — parametrización de `set_config`.
