# Architecture Decision Records

Log versionado de decisiones arquitectónicas de `portal-control`.
Docs as Code: Markdown en el repo, revisado por PR, formateado
con Prettier (`printWidth: 100`).

## Índice

| ADR                                                | Estado    | Resumen                               |
| -------------------------------------------------- | --------- | ------------------------------------- |
| [0001](0001-postgres-pgbouncer-dual-url.md)        | Aceptado  | Postgres + PgBouncer + URL dual       |
| [0002](0002-prisma-migrate-seed-entrypoint.md)     | Aceptado  | Migración y seed en entrypoint        |
| [0003](0003-express-zod-openapi-contract-guard.md) | Aceptado  | Contrato API con guards               |
| [0004](0004-jwt-fail-fast.md)                      | Aceptado  | JWT fail-fast sin fallback débil      |
| [0005](0005-gitops-portainer-ghcr.md)              | Aceptado  | GitOps Portainer + GHCR               |
| [0006](0006-gateway-nginx-proxy-net.md)            | Aceptado  | Gateway Nginx + `proxy_net`           |
| [0007](0007-frontend-vite-sdk-generado.md)         | Aceptado  | Frontend Vite + SDK generado          |
| [0008](0008-ratchets-calidad.md)                   | Aceptado  | Ratchets de lint y validación         |
| [0009](0009-observabilidad-minima.md)              | Aceptado  | Observabilidad mínima incremental     |
| [0010](0010-sdd-agentic-workflow.md)               | Aceptado  | SDD mínimo (spec → plan → tasks)      |
| [0011](0011-runtime-hardening.md)                  | Aceptado  | Endurecimiento runtime y secretos     |
| [0012](0012-rock-solid-governance.md)              | Aceptado  | Cobertura, e2e smoke, docs check      |
| [0013](0013-ci-pr-full-deploy-main-gates.md)       | Aceptado  | CI completa en PR, solo gates en main |
| [0000](0000-template.md)                           | Plantilla | No usar como decisión                 |

## Ciclo de vida

`Propuesto` -> `Aceptado` -> `Deprecado` | `Reemplazado por ADR-XXXX`.

Reglas:

1. Nunca se borra un ADR aceptado. Se supersede con enlace.
2. Un ADR en `Propuesto` puede editarse en el mismo PR.
3. Un ADR `Aceptado` solo cambia por un ADR nuevo que lo reemplace.
4. Cada ADR cita archivos y líneas que lo implementan.

## Crear un ADR nuevo

1. Copiar `0000-template.md` a `NNNN-titulo-corto.md`.
2. Estado inicial: `Propuesto`.
3. Contexto con hechos verificables del código, no opiniones.
4. Registrar alternativas consideradas y por qué se descartaron.
5. En el PR, pasar a `Aceptado` al hacer merge.
6. Actualizar esta tabla en el mismo commit.

## Relación con otra documentación

- `AGENTS.md`: reglas operativas para agentes. Los ADR explican el porqué.
- `.jules/bolt.md`, `.jules/sentinel.md`: memoria de correcting.
  Cuando un aprendizaje se vuelve decisión permanente, se promueve a ADR.
- `README.md`: cómo desplegar. Los ADR explican por qué se despliega así.
- `OBSERVABILITY.md`: señales actuales. Detalle operativo de ADR-0009.
- `backend/docs/swagger.json`: contrato generado. Ver ADR-0003.
