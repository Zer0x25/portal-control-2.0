# Plan 080: perfilar subárbol de vista del Worker Portal

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Reutilizar el helper `RenderProfiler`, que no crea boundaries en producción,
   para medir únicamente el árbol visual que el container entrega.
2. Ejecutar el runner `measure:renders` solo para Worker Portal con viewport
   móvil y CPU 4×; dirigir las llamadas API y WebSocket a staging local aislado.
3. Revisar la cobertura del scope, commits perdidos, sincronización, errores API
   y WebSocket antes de interpretar las duraciones.
4. Comparar el scope visual con el scope de ruta solo como scopes anidados; no
   sumarlos ni convertirlos en tiempos de producción.
5. Registrar la decisión sobre la siguiente medición/optimización, limpiar la
   configuración temporal y ejecutar preflight.

## Archivos a tocar

| Archivo                                                                     | Cambio                                                   |
| --------------------------------------------------------------------------- | -------------------------------------------------------- |
| `frontend/src/features/worker-portal/containers/WorkerPortal.container.tsx` | Añadir boundary de desarrollo `worker-portal:view`.      |
| `specs/080-worker-portal-view-subtree-render-profile/`                      | Especificación, reporte y perfil React de tres muestras. |
| `.jules/bolt.md`                                                            | Registrar atribución del subárbol y siguiente hipótesis. |

## Contratos afectados

Ninguno. El boundary de React Profiler es de desarrollo y no altera contratos,
props, queries, datos ni el build de producción.

## Riesgos y rollback

- Los límites de scopes React anidados pueden confundirse con sumas; reportar
  cada scope separado y no restarlos para atribuir hooks.
- Vite dev puede presentar errores de proxy/WebSocket o datos de staging
  variables; registrar fallos y no tratar estos tiempos como Lighthouse.
- Rollback: quitar el wrapper `RenderProfiler` del container y retirar la
  evidencia de este perfil; no requiere cambio del staging.
- No tocar la vista protegida ni su estructura de markup.

## Verificación

```bash
cd frontend
fnm exec --using=26.10.0 -- npm run measure:renders -- --route=worker-portal --viewport=mobile --cpu-throttle=4 --samples=3 --output=../specs/080-worker-portal-view-subtree-render-profile/evidencia/worker-portal-view-render-profile-2026-10-24.json
fnm exec --using=26.10.0 -- npm run check
fnm exec --using=26.10.0 -- npm run lint
cd ..
npm run spec:check
npm run docs:check
npm run lint:budget
node .agents/skills/ci-preflight/scripts/preflight.cjs
git diff --check
```
