# Plan 082: estabilizar el lookup de turnos del Worker Portal

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Capturar tres perfiles baseline de Worker Portal con la versión `5bf9943` y
   la configuración de Spec 081.
2. Agregar un test que cambie solo estados de carga de query y compruebe que el
   callback de turnos conserva la referencia.
3. Usar un array vacío estable para permisos ausentes, agruparlos con `useMemo`
   y envolver el lookup con `useCallback` sobre las colecciones que consulta.
4. Repetir los tres perfiles bajo la misma configuración y guardar ambos JSON.
5. Validar reglas y comportamiento de tests antes del commit local.

## Archivos a tocar

| Archivo                                                           | Cambio                                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `frontend/src/hooks/useScheduling.ts`                             | Estabilizar fallback de permisos, mapa agrupado y callback de lookup. |
| `frontend/src/tests/hooks/useSchedulingQueryGating.test.tsx`      | Probar identidad estable ante cambios de estado sin cambios de datos. |
| `spec.md`, `plan.md`, `tasks.md`                                  | Registrar criterios y resultado.                                      |
| `evidencia/worker-portal-baseline-render-profile-2026-10-24.json` | Guardar tres perfiles pre-cambio.                                     |
| `evidencia/worker-portal-render-profile-2026-10-24.json`          | Guardar tres perfiles post-cambio.                                    |
| `evidencia/resultado-2026-10-24.md`                               | Comparar conteos, duraciones y límites.                               |

## Contratos afectados

Ninguno. No cambian el contrato del helper, rutas, esquemas ni SDK.

## Riesgos y rollback

El mapa agrupado debe invalidarse cuando cambie la colección de permisos y el
callback cuando cambie cualquiera de sus mapas de consulta. `useMemo` y
`useCallback` reciben esas dependencias explícitamente. Si el test de identidad
o el perfil de resultados falla, revertir el helper de lookup y el mapa; no
cambiar las reglas de cálculo.

## Verificación

- `cd frontend && npm run test:run -- src/tests/hooks/useSchedulingQueryGating.test.tsx src/tests/features/worker-portal/useWorkerPortalData.test.tsx`
- `cd frontend && npm run check`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `npm run spec:check`
- `npm run docs:check`
- `node .agents/skills/ci-preflight/scripts/preflight.cjs`
- Perfil: `npm run measure:renders -- --route=worker-portal --samples=3 --viewport=mobile --cpu-throttle=4 --output=../specs/082-perf-worker-portal-schedule-lookup-memoization/evidencia/worker-portal-render-profile-2026-10-24.json`
