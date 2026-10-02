# Constitución del desarrollo agéntico

Principios no negociables para todo trabajo humano o agéntico en
`portal-control`. Extraídos de `AGENTS.md` y `docs/adr/`. Si un spec o
plan los contradice, el spec está mal, no la constitución.

## I. Contrato antes que código

Toda ruta nueva o modificada declara su montaje en `ROUTE_MOUNTS`
(`backend/src/app.ts`), documenta `@openapi` con el prefijo exacto y
regenera `backend/docs/swagger.json` + `frontend/src/types/api-schema.ts`
vía `npm run check:sdk`. Ver ADR-0003.

## II. Base de datos con pooler consciente

Nunca transacciones interactivas ni `set_config` sobre PgBouncer. Usar
`withDirectTransaction()` (`backend/src/services/db.ts`). Nunca N+1 en
bucles: batch-fetch con `findMany({ in: [...] })` o
`schedulingService.getSchedulingContext()`. Ver ADR-0001.

## III. Seguridad fail-fast

Sin `exec` con interpolación (usar `execFile`/`spawn` + argv). Sin
`$executeRawUnsafe` concatenado (usar `$executeRaw` parametrizado). Sin
fallbacks débiles para `JWT_SECRET`. Validar el 100% del lote, nunca
`slice(0, N)`. Ver ADR-0004 y `.jules/sentinel.md`.

## IV. Calidad con ratchet, no con tolerancia

`lint-budget.json` en 0. `ALLOWED_UNVALIDATED_ROUTES` en 0. Todo cambio
deja `npm run validate:ci` verde en ambos paquetes. Sin `any` en
producción, sin `console.log` de debug. Ver ADR-0008.

## V. Spec antes que PR

Ningún cambio funcional entra sin `specs/NNNN-slug/spec.md` con criterios
de aceptación verificables, `plan.md` con archivos a tocar y `tasks.md`
con checkboxes ejecutables por un agente. Las decisiones permanentes se
promueven a ADR. Ver `docs/adr/0010-sdd-agentic-workflow.md`.
