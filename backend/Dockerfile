# Build Stage
FROM node:26-alpine AS builder
LABEL org.opencontainers.image.source="https://github.com/Zer0x25/portal-control"

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copiar código y compilar
COPY . .
# Prisma 7 evalua prisma.config.ts (exige DIRECT_URL) en todo comando del
# CLI, incluido generate. El codegen no abre conexiones: dummy imposible de
# conectar a proposito (localhost:1) solo para satisfacer la evaluacion.
RUN DIRECT_URL=postgresql://prisma-codegen:prisma-codegen@localhost:1/prisma-codegen npx prisma generate
RUN npm run build

# Install the runtime tree separately: do not copy legacy/dev dependencies into image layers.
FROM node:26-alpine AS runtime-deps
WORKDIR /app
COPY package*.json ./
COPY --from=builder /root/.npm /root/.npm
RUN npm ci --omit=dev --ignore-scripts --offline --no-audit --no-fund
# Preserve Prisma CLI postinstall engines without downloading them at startup.
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines

# Production Stage
FROM node:26-alpine
LABEL org.opencontainers.image.source="https://github.com/Zer0x25/portal-control"

# Instalar cliente de PostgreSQL para backups, curl para healthchecks y tini para reaps de zombies
RUN apk add --no-cache postgresql-client curl tini

WORKDIR /app

# Dependencies change less often than code: preserve this layer across runtime edits.
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docs/swagger.json ./docs/swagger.json
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
# Prisma 7: el CLI evalua prisma.config.ts en CUALQUIER comando (migrate,
# seed). Sin este COPY el arranque falla con "datasource.url is required".
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

EXPOSE 4000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=4000

# Al arrancar: aplicar migraciones, (opcionalmente) seed y encender servidor.
# tini (-s) como ENTRYPOINT (PID 1) hace reaps de procesos hijos (evita zombies de prisma/seed/backup).
# Nota: evitamos `db push --accept-data-loss` en runtime por riesgo de pérdida de datos.
# El seed es idempotente (y en producción solo crea el admin si falta).
ENTRYPOINT ["tini", "-s", "--"]
CMD ["sh", "-c", "echo '>>> [DOCKER] Aplicando migraciones...' && npx prisma migrate deploy && echo '>>> [DOCKER] Ejecutando seed (idempotente)...' && npx prisma db seed && echo '>>> [DOCKER] Servidor iniciando...' && npm start"]
