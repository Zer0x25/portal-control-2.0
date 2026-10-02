# Spec 001: Alineación a Node 24 + builds estrictos

- Estado: Implementado
- Autor: opencode
- Fecha: 2026-10-02
- ADR relacionado: `docs/adr/0005-gitops-portainer-ghcr.md`

## Problema

`AGENTS.md:9` y CI (`.github/workflows/ci.yml:80,118,177`) exigen Node 24,
pero todos los Dockerfiles usaban `node:20-alpine`
(`backend/Dockerfile:2`, `frontend/Dockerfile:2`). Además
`backend/Dockerfile:15` tragaba errores de tipos con
`npm run build || (echo WARNING ...)` y varios Dockerfiles usaban
`npm install` en lugar de `npm ci`, rompiendo reproducibilidad.

## Alcance

Dentro:

- Unificar runtime a Node 24 en Dockerfiles backend/frontend.
- `npm ci` en builds, build estricto en backend.
- `.nvmrc` + `engines >= 24` + Dependabot npm/docker.

Fuera (explícito):

- Pineo por digest de imágenes base.
- Cambio de `postgres:15-alpine` / `pgbouncer:latest`.

## Criterios de aceptación

- [x] AC1: ningún `Dockerfile*` referencia `node:20`.
- [x] AC2: ningún Dockerfile usa `npm install`; todos usan `npm ci`.
- [x] AC3: `backend/Dockerfile` no contiene fallback `||` tras el build.
- [x] AC4: `.nvmrc` existe y `engines` exige Node >= 24 en ambos paquetes.
- [x] AC5: `.github/dependabot.yml` cubre npm (backend/frontend) y docker.
- [x] AC6: `@types/node` sigue la línea 24 (`^24.x`) y `undici-types` la 7.x,
      para que los tipos describan el runtime que realmente se ejecuta.
- [x] AC7: Dependabot ignora `node >=25-alpine` (docker) y `@types/node >=25`
      (npm), de modo que la línea 26 no se re-proponga cada semana.

## Línea Node: 24 y no 26

| Línea | Estado     | Active LTS | EOL        |
| ----- | ---------- | ---------- | ---------- |
| 24.x  | Active LTS | 2025-10-28 | 2028-04-30 |
| 26.x  | Current    | 2026-10-28 | 2029-04-30 |

La documentación oficial de Node indica que las aplicaciones en producción deben
usar solo versiones **Active LTS** o **Maintenance LTS**. Hasta que 26 alcance
Active LTS (2026-10-28), adoptar 26 dejaría el repositorio con tres líneas
distintas en simultaneo — `.nvmrc`, `engines.node`, `node-version` en CI y
`FROM node:24-alpine` — y los tipos describirían una API que no se ejecuta.

Consecuencia operativa: sin los ignores de AC7, Dependabot reabre cada lunes
los mismos PRs de Node 26, y cada uno consume una corrida completa de 7 jobs de
CI antes de volver a cerrarse.

## Restricciones

Constitución I–V sin impacto funcional: solo toolchain. Rollback por
revert del commit.

## Trazabilidad

- Tests: `npm run validate:ci` backend + frontend en CI 24.
- Docs a actualizar: este spec, ADR-0010 como ejemplo piloto.
