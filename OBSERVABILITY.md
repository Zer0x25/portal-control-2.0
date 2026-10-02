# Portal Control Observability

Service-level observability baseline for `portal-control` on top of the shared `monitoring` and `uptime` stacks.

## Purpose

- define what signals actually matter for `portal-control`
- avoid treating generic container metrics as full application health
- guide the next monitoring improvements without overbuilding too early

## Current Signals Already Available

- public route availability through `portal-public` in Uptime Kuma
- backend health endpoint through `http://10.191.108.122:4000/api/health`
- container CPU and memory through cAdvisor
- host resource pressure through Prometheus + node-exporter
- Docker healthchecks for `db`, `pgbouncer`, `backend`, and `frontend`

## Health Signals

- `portal-public` responds through Cloudflare, tunnel, proxy, and gateway path
- `portal-backend-health` responds on LAN
- `backend` container stays healthy after migrations and seed sequence
- `pgbouncer` remains healthy and accepts local readiness checks
- `db` remains healthy and reachable from the app stack

## Failure Indicators

- `portal-public` down while backend LAN health remains up -> suspect Cloudflare, tunnel, proxy, or gateway layer
- backend health down -> suspect app startup, migrations, Prisma connection, or DB path
- repeated restarts in `backend`, `gateway`, or `frontend`
- sustained memory growth in `backend`
- high disk pressure on the host affecting backups or uploads

## Resource Concerns

- backend memory growth over time
- DB storage growth inside `postgres_data`
- backup and uploads growth at `/srv/server-lab/services/portal-control`
- CPU spikes during migrations, seeding, or backup operations

## Dashboard Needed

- yes, but incremental
- first useful view should show `backend`, `frontend`, `gateway`, `pgbouncer`, and `db`
- include CPU, memory, restart behavior, and relation between public route health and backend health

## Alert Needed

- later
- first alert candidates should be backend down, public route down, and disk pressure on host

## Recommended Next Metrics

- container restart count trend for `portal-control`
- DB volume growth visibility
- backup recency and backup failure visibility
- optional app-level metrics only if the backend exposes something truly useful later

## Operator Interpretation

- if `portal-public` fails but `portal-backend-health` stays healthy, do not start debugging Prisma first
- if backend health fails and host resources are stable, inspect backend logs and DB path next
- if host memory or disk is pressured, treat infra pressure as part of the incident, not only the app symptom
