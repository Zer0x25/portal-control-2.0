# Plan 070: atribuir updates del shell durante readiness

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Extender `RenderProfiler` con una función de envoltura que en producción
   devuelva directamente el elemento hijo, sin insertar componentes wrapper.
2. Separar en desarrollo el scope `App`, el proveedor de persistencia de Query,
   el router, el overlay de sync y las ramas globales que se montan durante el
   arranque.
3. Reusar `measure:renders` y su correlación existente para tres perfiles fríos
   a CPU 4×; comprobar que el buffer no descarte eventos.
4. Revisar scopes solapados y escoger el siguiente componente según la evidencia;
   conservar las duraciones de desarrollo solo como atribución.
5. Guardar el JSON/resultado, actualizar `.jules/bolt.md` y ejecutar preflight,
   build de producción y commit Conventional.

## Archivos a tocar

| Archivo                                               | Cambio                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `frontend/src/utils/RenderProfiler.tsx`               | Exponer envoltura Profiler que no crea boundaries en producción.   |
| `frontend/src/main.tsx`                               | Añadir un scope de `App` solo al árbol de desarrollo.              |
| `frontend/src/App.tsx`                                | Medir overlay inicial, indicadores y rutas en desarrollo.          |
| `frontend/src/contexts/AppProviders.tsx`              | Separar proveedor de persistencia de Query y router en desarrollo. |
| `specs/070-time-control-readiness-shell-attribution/` | Guardar procedimiento, resultado y muestras.                       |
| `.jules/bolt.md`                                      | Registrar el subárbol atribuido y el siguiente foco.               |

## Riesgos y rollback

La lista de eventos puede alcanzar el límite al agregar scopes. El runner informa
eventos descartados y la captura no se acepta si el contador es mayor que cero.
Rollback: quitar la envoltura auxiliar y los scopes de desarrollo, dejando el
perfil existente de Spec 069.

## Verificación

`fnm exec --using=26.10.0 -- npm --prefix frontend run check`, lint/frontend,
`measure:renders -- --route=time-control --viewport=mobile --cpu-throttle=4
--samples=3`, `npm run spec:check`, `npm run docs:check`, `npm run lint:budget`,
build de producción y preflight antes del commit.
