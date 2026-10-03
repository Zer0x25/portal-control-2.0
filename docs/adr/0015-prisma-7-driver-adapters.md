# ADR-0015: Migración Prisma 6 a 7 con driver adapters

- Estado: Propuesto
- Fecha: 2026-10-03
- Autores: zer0x
- Spec:related: ADR-0001 (Postgres + PgBouncer + URL dual)

## Contexto

Prisma 7 elimina el cliente con pool interno (`prisma-client-js` pasa a
legacy): exige driver adapter para SQL, `prisma.config.ts` para el CLI y
entrypoint generado en ruta explícita. El repo usa PgBouncer en modo
transacción con doble URL (`DATABASE_URL` pool + `DIRECT_URL` directo) y
un cliente extendido con auditoría (`src/services/db.ts`), así que la
migración toca el path más crítico del backend.

51 archivos importaban `@prisma/client`; ningún uso de `$use`
(middleware removido, ya usábamos `$extends`), `Prisma.validator` ni
Accelerate.

## Decisión

1. Generador `prisma-client` con `output = "../src/generated/prisma"` y
   `moduleFormat = "cjs"` (el backend es CommonJS). Dentro de `src/` para
   no romper `rootDir` de `tsc`; excluido de ESLint, Prettier y git.
   Todos los imports pasan a la ruta relativa del entrypoint `client`.
2. `db.ts` construye `pg.Pool` explícitos + `PrismaPg` por cliente, con
   paridad de pool v6 (`max: 10`, `connectionTimeoutMillis: 5000` porque
   `pg` por defecto no tiene timeout, vital vía PgBouncer). Construcción
   lazy como v6: sin `DATABASE_URL` el fallo es al primer query, no al
   importar (los unit tests no tienen DB).
3. `prisma.config.ts` con `datasource.url = env("DIRECT_URL")`: las
   migraciones del CLI nunca pasan por PgBouncer (igual que `directUrl`
   en v6, que se elimina del schema junto con `url`, ya no soportada).
   `migrations.seed` declarado ahí (v7 ignora `package.json#prisma.seed`).
4. `DIRECT_URL` es obligatorio para CUALQUIER comando del CLI (evalúa la
   config incluso en `generate`). Codegen/build sin DB usan dummy
   `localhost:1` documentado (CI, `Dockerfile`, `Dockerfile.dev`); el
   runtime usa env real de compose.
5. Scripts standalone comparten `scripts/prismaClient.cjs` (CJS a
   propósito: lo consumen `.ts` vía tsx y `.js` legacy vía node).
   `prisma/seed.ts` construye su adapter inline con `DATABASE_URL`,
   misma semántica que el datasource v6.
6. `auditService.ts` castea JSON a `Prisma.InputJsonValue`: v7 envuelve
   los Json en `Exact<...>` y el `Record<string, unknown>` ya no entra
   directo (único cambio de código además de `sentry.ts`-style fixes).

## Alternativas consideradas

1. Quedarse en `prisma-client-js` legacy de v7 — descartada: deprecado
   y sin fecha de remoción conocida; solo posterga esta misma migración.
2. Fail-fast en `db.ts` si falta `DATABASE_URL` — descartada: rompería
   los unit tests en CI (sin DB) que importan servicios transitivamente;
   se conserva la semántica lazy de v6.
3. `output` fuera de `src/` (`backend/generated`) — descartada: rompe
   `rootDir` de `tsc` (TS6059). El `.gitignore` ya anticipaba
   `/src/generated/prisma`.

## Consecuencias

Positivas:

- Cliente Rust-free, sin descarga de engines; `generate` en 139 ms.
- Pool explícito y auditable en vez de defaults implícitos del cliente.
- Migraciones y seed verificados contra Postgres real; suite de
  integración 178/184 con el adapter (los 6 fallos son preexistentes,
  idénticos en v6: fixtures con fechas fijas podridas por calendario y
  un assertion de cadena de integridad).

Negativas / costos aceptados:

- Regla nueva para agentes: importar SIEMPRE desde
  `src/generated/prisma/client`, nunca `@prisma/client` (ver AGENTS.md).
- 6 tests de integración rojos antes y después (baseline documentado,
  fuera de alcance de esta migración).
- `prisma db seed` y todo comando CLI exigen `DIRECT_URL` en el entorno
  (falla explícito si falta, por diseño).

## Referencias

- `backend/src/services/db.ts` — pools + adapters + `withDirectTransaction`.
- `backend/prisma.config.ts` — config del CLI (schema, migraciones, seed).
- `backend/prisma/schema.prisma` — generador `prisma-client` cjs.
- `backend/scripts/prismaClient.cjs` — cliente compartido de scripts.
- `docs/adr/0001-postgres-pgbouncer-dual-url.md` — diseño dual-URL origen.
