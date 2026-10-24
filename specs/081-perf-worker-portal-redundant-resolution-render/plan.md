# Plan 081: evitar render redundante al resolver el Worker Portal

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Mantener el perfil de Spec 080 como baseline: cinco commits de ruta, cuatro
   de vista y un evento de ruta de 0 ms en cada contexto.
2. Derivar `status` directamente de `employee` y `latestEmployeeRecord`; retirar
   el estado `latestOpenRecord`, que la vista no consume.
3. Derivar el indicador de carga de empleado sin `isEmployeeResolutionFinished`.
4. Añadir una regresión del hook que compruebe el valor de `status` en un solo
   render cuando el registro está disponible al montar.
5. Repetir tres perfiles fríos de Worker Portal con la misma versión de Node,
   navegador, viewport, CPU throttle, Vite dev y API de staging local.
6. Guardar la comparación y validar las reglas antes del commit local.

## Archivos a tocar

| Archivo                                                                  | Cambio                                                                |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `frontend/src/features/worker-portal/hooks/useWorkerPortalData.ts`       | Derivar `status` y carga; quitar los estados derivados no consumidos. |
| `frontend/src/tests/features/worker-portal/useWorkerPortalData.test.tsx` | Comprobar el estado de marcaje correcto en un solo render.            |
| `spec.md`, `plan.md`, `tasks.md`                                         | Registrar alcance, verificación y resultado.                          |
| `evidencia/worker-portal-baseline-render-profile-2026-10-24.json`        | Guardar baseline A/B de tres perfiles con Node 26.                    |
| `evidencia/worker-portal-render-profile-2026-10-24.json`                 | Guardar los tres perfiles posteriores.                                |
| `evidencia/resultado-2026-10-24.md`                                      | Comparar muestras emparejadas y declarar límites.                     |

## Contratos afectados

Ninguno. No cambian rutas, esquemas, contratos Prisma, OpenAPI ni SDK.

## Riesgos y rollback

El riesgo está en cambiar el estado de marcaje durante una transición donde el
empleado aún no se resolvió. En esa condición el valor derivado vuelve a
`fuera`; una vez resuelto, usa el último registro acotado al empleado. El
indicador conserva la carga mientras la query inicial o el fallback están en
curso. Si falla la regresión de estado o carga, revertir los cambios del hook y
su test.

## Verificación

- `cd frontend && npm run test:run -- src/tests/features/worker-portal/useWorkerPortalData.test.tsx`
- `cd frontend && npm run check`
- `cd frontend && npm run lint`
- `npm run spec:check`
- `npm run docs:check`
- `npm run lint:budget`
- `node .agents/skills/ci-preflight/scripts/preflight.cjs`
- Perfil manual: `npm run measure:renders -- --route=worker-portal --samples=3 --viewport=mobile --cpu-throttle=4 --output=../specs/081-perf-worker-portal-redundant-resolution-render/evidencia/worker-portal-render-profile-2026-10-24.json`
