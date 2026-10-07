# Plan 018: KPI

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Estrategia y archivos

Extraer validación/orquestación de controllers/kpiController.ts a aplicación
pura modules/kpis/application con puertos de fechas y motor; composición en
services/kpiFlows.ts. Adaptador modules/kpis/http/routes.ts usa schema existente.
API pública index.ts. Registrar en platform/fastify/app.ts, runtime.ts y contrato
exacto no vacío routeContracts.ts. Ampliar tsconfig.modules y guard arquitectónico.
Motor services/kpi/* conserva cálculos, cache y reloj actuales. Proyección de PIN
en KpiReportService/KpiAggregationService usa API pública employees. Prueba
kpiProjection verifica una ausencia concreta; fastifyApp verifica límites 1 MiB.

BDD: [behavior.md](behavior.md). RED unit kpiFlows antes de implementación;
paridad real Express/Fastify en tests/fastify-integration/kpis.test.ts.

## Verificación y rollback

Backend validate:ci, test:coverage y test:fastify:integration. Luego frontend
validate:ci:coverage; raíz docs:check, spec:check, secrets:scan. Sin staging ni
cutover. Revertir este cambio; Express conserva montaje y contrato existentes.
