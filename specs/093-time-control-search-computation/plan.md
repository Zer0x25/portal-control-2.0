# Plan 093: diferir el cálculo de resultados del buscador

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Mantener la consulta de empleados y el auto inicio de jornada sin cambios;
   el experimento anterior mostró que esas opciones son necesarias para el
   shell en el perfil medido.
2. Memorizar `filteredEmployees` por lista, texto de búsqueda y selección.
3. Retornar una lista vacía antes de normalizar, filtrar u ordenar si el texto
   está vacío o ya existe una selección; la vista solo presenta resultados en
   el estado contrario.
4. Probar que el camino inicial no normaliza empleados y que la búsqueda
   acentuada, resultados, selección y marcaje sigan funcionando.
5. Reconstruir staging, repetir tres perfiles de producción y cinco corridas
   Lighthouse; registrar la imagen y la configuración exactas.
6. Actualizar la evidencia y `.jules/bolt.md`; no afirmar causalidad de TBT con
   perfiles muestreados.

## Archivos a tocar

| Archivo                                                             | Cambio                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| `frontend/src/features/time-control/hooks/useClockingPanel.ts`      | Omitir cálculo oculto y memorizar los resultados activos.      |
| `frontend/src/tests/components/time_control/ClockingPanel.spec.tsx` | Cubrir camino vacío, búsqueda sin tildes, selección y marcaje. |
| `specs/093-time-control-search-computation/`                        | Criterios, plan, tareas y evidencia.                           |
| `.jules/bolt.md`                                                    | Resultado medido y siguiente foco.                             |

## Contratos afectados

Sin cambios. Se conserva el endpoint y la clave TanStack Query existentes.

## Riesgos y rollback

El filtrado puede alterar coincidencias si cambia la normalización o el orden.
Los tests deben confirmar ambas propiedades. Si el callback sigue dentro de
tareas largas sin una reducción observable, restaurar el cálculo original y
conservar solo el diagnóstico.

## Verificación

```bash
fnm exec --using 26.10.0 -- npm --prefix frontend run test:run -- src/tests/components/time_control/ClockingPanel.spec.tsx
fnm exec --using 26.10.0 -- npm --prefix frontend run check
fnm exec --using 26.10.0 -- npm --prefix frontend exec -- eslint src/features/time-control/hooks/useClockingPanel.ts src/tests/components/time_control/ClockingPanel.spec.tsx
fnm exec --using 26.10.0 -- npm --prefix frontend run perf:profile:route -- --route=time-control --viewport=mobile --cpu-throttle=4 --output=../specs/093-time-control-search-computation/evidencia/time-control-production-cpu-after-2026-10-25.json
fnm exec --using 26.10.0 -- npm --prefix frontend run perf:time-control:cold
fnm exec --using 26.10.0 -- npm run preflight
```
