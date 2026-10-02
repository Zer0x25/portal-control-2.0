# ADR-0002: Migración y seed idempotente en entrypoint del backend

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: retroactivo desde código

## Contexto

El stack se despliega con imágenes prebuild en Portainer
(`compose.yaml:54-84`). Si la migración no corre antes del arranque,
el backend inicia contra un esquema viejo y falla el healthcheck
(`compose.yaml:91-96`). El seed debe ser re-ejecutable en cada
redeploy sin duplicar el admin.

## Decisión

El `entrypoint` del backend (`compose.yaml:77-84`) ejecuta en orden,
con `DATABASE_URL=$DIRECT_URL`:

1. `npx prisma migrate deploy`.
2. `npx prisma db seed` (idempotente).
3. `npm start` ya sobre PgBouncer.

Se usa `tini -s` como PID 1 para reap de hijos (prisma/seed/backup).

## Alternativas consideradas

1. Migrar en CI contra producción — descartada porque expone la DB
   y rompe GitOps (CI no tiene acceso LAN).
2. Migrar manualmente por SSH — descartada porque olvidos causan
   deriva esquema-código.

## Consecuencias

Positivas:

- Cada redeploy deja esquema + seed listos sin paso manual.
- Secuencia visible en logs (`>>> [DOCKER] ...`).

Negativas / costos aceptados:

- Arranque más lento (`start_period: 80s` en healthcheck).
- Un seed no idempotente rompería todos los deploys; debe testearse.

## Referencias

- `compose.yaml:77-84` — entrypoint con migraciones y seed.
- `compose.yaml:91-96` — healthcheck `/api/health`.
- `backend/package.json:108-110` — `prisma.seed`.
