# Plan 056: Time Control Early Content

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Reproducir con una prueba la condición que bloquea la página durante la carga de registros y proteger la espera de configuración.
2. Cambiar solo el cálculo de `isPageLoading` en el hook de orquestación; mantener `isLoading` conectado a la tabla.
3. Ejecutar pruebas enfocadas, checks frontend y preflight.
4. Reconstruir staging local y comparar tres cargas frías de Control horario con el ledger de Spec 039.

## Archivos a tocar

| Archivo                                                               | Cambio                                                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `frontend/src/features/time-control/hooks/useTimeControlData.ts`      | No bloquear cabecera y filtros por la consulta de registros; conservar el gate de configuración. |
| `frontend/src/tests/features/time-control/useTimeControlData.test.ts` | Verificar por separado carga de registros y carga de configuración.                              |
| `frontend/src/tests/features/time-control/TimeControlView.test.tsx`   | Asegurar que la cabecera renderiza mientras la tabla sigue cargando.                             |
| `frontend/e2e/performance.spec.ts`                                    | Retener GET `/api/records` y comprobar que la cabecera aparece antes de liberar la respuesta.    |
| `specs/056-time-control-early-content/*`                              | Registrar aceptación, resultado y medición post-rebuild.                                         |

## Contratos afectados

Ninguno. No cambian rutas HTTP, OpenAPI, SDK, esquemas Prisma ni datos de negocio.

## Riesgos y rollback

El contenido estático puede aparecer antes mientras la tabla conserva su skeleton/carga. La configuración sigue bloqueando la página hasta poder decidir el panel de marcaje. Rollback: restaurar el predicado anterior de `isPageLoading`.

## Verificación

```bash
fnm exec --using 26.10.0 -- npm --prefix frontend run test:jsdom -- src/tests/features/time-control/useTimeControlData.test.ts src/tests/features/time-control/TimeControlView.test.tsx
fnm exec --using 26.10.0 -- npm --prefix frontend run check
fnm exec --using 26.10.0 -- npm --prefix frontend run lint
fnm exec --using 26.10.0 -- npm run preflight
# Rebuild staging and run its performance battery using the runbook in .agents/skills/staging-audit/SKILL.md.
```
