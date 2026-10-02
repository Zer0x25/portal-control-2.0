# ADR-0009: Observabilidad mínima e incremental, sin métricas app prematuras

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: retroactivo desde código

## Contexto

Tratar métricas genéricas de contenedor como salud de aplicación
oculta fallos reales (gateway vs backend vs túnel). No existe aún una
métrica de negocio que justifique instrumentación custom
(`OBSERVABILITY.md:1-10,53-58`).

## Decisión

Baseline actual sin sobrediseñar (`OBSERVABILITY.md:11-40`):

- Uptime Kuma: ruta pública + `/api/health` LAN.
- cAdvisor + Prometheus + node-exporter: CPU/mem/host.
- Docker healthchecks en `db`, `pgbouncer`, `backend`, `frontend`.
- Regla de triage: pública caída + backend OK = mirar
  Cloudflare/túnel/proxy/gateway, no Prisma.

Dashboard incremental después; alertas después (backend down,
pública down, disco). Métricas app solo si el backend expone algo
realmente útil.

## Alternativas consideradas

1. Instrumentación completa desde día 1 — descartada por costo sin
   señal accionable.
2. Solo logs contenedor — descartada porque no distingue capas.

## Consecuencias

Positivas:

- Diagnóstico por capas evita debug Prisma innecesario.
- Backlog medido: restarts, crecimiento DB, recencia de backups.

Negativas / costos aceptados:

- Sin alertas automáticas todavía; detección manual.
- Crecimiento de backups/uploads vigilado a mano.

## Referencias

- `OBSERVABILITY.md` — baseline completa.
- `compose.yaml:12-16,41-46,91-96,113-120` — healthchecks.
