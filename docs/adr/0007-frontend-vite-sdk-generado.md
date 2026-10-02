# ADR-0007: Frontend Vite + SDK generado desde OpenAPI

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: retroactivo desde código

## Contexto

`AGENTS.md:9` menciona Redux Toolkit, pero `frontend/package.json:30-54`
instala Zustand, TanStack Query y React Router. Sin fuente de verdad, el
estado servidor/cliente diverge y los tipos del API derivan a mano.

## Decisión

Frontend React 18 + Vite + Tailwind. Estado servidor con TanStack Query,
estado cliente con Zustand, routing con React Router. Tipos del API
generados con `openapi-typescript` desde `backend/docs/swagger.json`
(`frontend/package.json:28`: `sdk:generate`). Sincronía enforced por
`check:sdk` del backend (ADR-0003).

Nota: si se reintroduce Redux Toolkit, debe hacerse por ADR nuevo que
reemplace este.

## Alternativas consideradas

1. Redux Toolkit global — descartada por boilerplate para un portal CRUD
   con mucho estado servidor cacheable.
2. Tipos manuales del API — descartada porque divergen (caso
   `TimeRecordStatus.Licencia Médica`, `AGENTS.md:210-214`).

## Consecuencias

Positivas:

- Tipos backend-frontend siempre alineados o CI falla.
- Caché servidor y estado cliente separados y testeables.

Negativas / costos aceptados:

- Regenerar SDK en cada cambio de contrato.
- `AGENTS.md:9` queda desactualizado hasta corregirlo.

## Referencias

- `frontend/package.json:28` — `sdk:generate`.
- `frontend/package.json:30-54` — dependencias reales.
- `AGENTS.md:210-214` — bug encontrado por tipar estricto.
- `AGENTS.md:256-259` — `check:sdk`.
