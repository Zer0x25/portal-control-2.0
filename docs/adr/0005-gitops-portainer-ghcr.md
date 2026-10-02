# ADR-0005: Despliegue GitOps con imágenes prebuild en GHCR + Portainer

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: retroactivo desde código

## Contexto

El servicio corre en Server.lab tras Caddy (`README.md:5-16`). Hacer
`build:` en el servidor es lento, no reproducible y acopla el deploy al
estado del host. Se necesita changelog, tags y releases automáticos.

## Decisión

GitHub Actions construye y publica `backend`, `frontend` y `gateway` en
`ghcr.io/zer0x25/portal-control-*`. Portainer redeploya por tag
(`IMAGE_TAG`, default `latest` en `main`). `compose.yaml` solo referencia
imágenes (`compose.yaml:55,107,131`), nunca `build:`. Variables en
Portainer UI. Commits en Conventional Commits para `release-please`
(`README.md:58-81`, `.release-please-manifest.json`).

## Alternativas consideradas

1. `build:` en Portainer — descartada por builds lentos y deriva.
2. `.env` en el servidor — descartada por riesgo de fuga en GitOps.

## Consecuencias

Positivas:

- Deploy = `push` + redeploy por tag, reproducible.
- Changelog y tags automáticos.

Negativas / costos aceptados:

- Depender de GHCR y del tag correcto (`sha-cfc4706` pineado hoy).
- Portainer debe configurarse a mano la primera vez.

## Referencias

- `README.md:35-57` — flujo GitOps y variables Portainer.
- `README.md:58-81` — Conventional Commits + release-please.
- `compose.yaml:55,107,131` — imágenes GHCR.
- `.github/` — pipelines CI/CD.
