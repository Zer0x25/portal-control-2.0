# ADR-0006: Gateway Nginx + red externa `proxy_net`

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: retroactivo desde código

## Contexto

Exposición pública vía `https://portal.tu-dominio.com` con ingress Caddy
(`README.md:5-16`). Frontend y backend no deben exponerse directo; hace
falta un punto único de enrutamiento y persistencia fuera del workspace
de Portainer (`README.md:84-89`).

## Decisión

Servicio `gateway` (build `nginx/Dockerfile`) como único borde interno.
`backend`, `frontend` y `gateway` comparten la red externa `proxy_net`;
solo `backend:4000` publica puerto host (`compose.yaml:54-137`).
Backups y uploads en rutas fijas del host (`BACKUP_HOST_PATH`,
`UPLOADS_HOST_PATH`), no en `/data/compose/<stack-id>/`.

## Alternativas consideradas

1. Exponer frontend/backend directo a Caddy — descartada porque duplica
   TLS/routing por servicio.
2. Volúmenes Docker para backups/uploads — descartada porque no
   sobreviven igual al redeploy y dificultan respaldo host.

## Consecuencias

Positivas:

- Un solo punto de integración con el proxy.
- Datos persistentes sobreviven a recreación de contenedores.

Negativas / costos aceptados:

- `proxy_net` externa debe existir antes del deploy.
- Cambios de routing exigen rebuild del gateway.

## Referencias

- `README.md:5-16` — topología y Public Link.
- `README.md:84-89` — estándar de integración.
- `compose.yaml:85-87,106-137` — volúmenes y redes.
- `nginx/` — build del gateway.
