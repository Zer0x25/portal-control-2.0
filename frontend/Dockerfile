# Build Stage
FROM node:24-alpine AS builder
LABEL org.opencontainers.image.source="https://github.com/Zer0x25/portal-control"

WORKDIR /app

ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

# Production Stage
FROM nginx:alpine
LABEL org.opencontainers.image.source="https://github.com/Zer0x25/portal-control"

# Copiar el build de Vite al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
