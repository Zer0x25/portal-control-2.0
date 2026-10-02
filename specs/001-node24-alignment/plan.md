# Plan 001: Alineación a Node 24 + builds estrictos

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Fijar `.nvmrc` en 24 y `engines >= 24` en ambos paquetes.
2. Subir `FROM node:20-alpine` a `node:24-alpine` en los 5 Dockerfiles.
3. Cambiar `npm install` por `npm ci` donde falte.
4. Eliminar el fallback `||` del build backend.
5. Añadir Dependabot npm + docker.
6. Mantener `@types/node` en la línea 24 e ignorar Node 26 en Dependabot, para
   que la decisión no se reabra cada lunes consumiendo minutos de CI.

## Archivos a tocar

| Archivo                    | Cambio                                                 |
| -------------------------- | ------------------------------------------------------ |
| `.nvmrc`                   | crear con `24`                                         |
| `backend/package.json`     | `engines.node >= 24`, `@types/node ^24.x`              |
| `frontend/package.json`    | `engines.node >= 24`                                   |
| `backend/Dockerfile`       | Node 24, `npm ci`, build estricto                      |
| `backend/Dockerfile.dev`   | Node 24, `npm ci`                                      |
| `frontend/Dockerfile`      | Node 24, `npm ci`                                      |
| `frontend/Dockerfile.dev`  | Node 24, `npm ci`                                      |
| `frontend/Dockerfile.prod` | Node 24                                                |
| `.github/dependabot.yml`   | crear; ignorar `node >=25-alpine` / `@types/node >=25` |

## Contratos afectados

Ninguno. Solo toolchain e imágenes.

## Riesgos y rollback

Riesgo bajo: CI ya valida en Node 24. Rollback con revert.

## Verificación

`grep -r node:20 Dockerfile*`, `grep -rn "npm install" Dockerfile*`,
`npx prettier --check` de specs, `npm run validate:ci` en CI.
