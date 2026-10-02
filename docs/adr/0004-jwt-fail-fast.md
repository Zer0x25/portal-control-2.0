# ADR-0004: Secretos criptográficos con fail-fast, sin fallback débil

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: retroactivo desde código

## Contexto

Existía un fallback hardcodeado para `JWT_SECRET` que enmascaraba mala
configuración y debilitaba firmas en producción
(`.jules/sentinel.md:11-14`). Las variables se gestionan en Portainer,
no en `.env` en el servidor (`README.md:20-33`).

## Decisión

Fallar rápido en arranque si falta `JWT_SECRET` u otro secreto
criptográfico. Prohibidos los defaults débiles. En desarrollo se permite
un valor explícito de dev (`compose.dev.yaml`), nunca en `compose.yaml`
de producción (`compose.yaml:62` sin default).

## Alternativas consideradas

1. Default débil con warning — descartada porque el warning se ignora
   y llega a producción.
2. Generar secreto aleatorio al arrancar — descartada porque invalida
   todas las sesiones en cada reinicio.

## Consecuencias

Positivas:

- Mala configuración = error explícito, no tokens forjables.
- Portainer es la única fuente de verdad en producción.

Negativas / costos aceptados:

- Dev local debe definir `JWT_SECRET` o usar el compose de desarrollo.

## Referencias

- `.jules/sentinel.md:11-14` — hallazgo y acción.
- `AGENTS.md:119-123` — prohibición de fallback débil.
- `compose.yaml:62` — `JWT_SECRET` sin default.
- `README.md:20-33` — gestión en Portainer.
