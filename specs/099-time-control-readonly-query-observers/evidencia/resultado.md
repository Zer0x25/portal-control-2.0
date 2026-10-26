# Resultado Spec 099: quitar observadores de mutación en lecturas

- Estado: implementado, reconstruido y verificado en staging local.
- Fecha: 2026-10-25.
- Imagen frontend de staging: `sha256:504515aa80db81e3a28a45f151d8d9f09e78c8a4591569af6b041ed6672f4134`.

## Cambio

`TimeRecordFilters` y `useClockingPanel` consultan `useTimeRecordsQuery`
directamente. Ambos necesitaban los registros y el estado de carga, pero el
wrapper `useTimeRecords` también montaba sus cuatro observadores de mutación y
suscribía a estados de escritura que esos lectores no consumen. El panel
conserva el observador de mutación que sí usa para marcar asistencia.

Los parámetros de consulta y la clave TanStack se mantienen. No cambian rutas,
filtros, paginación ni acciones. Los tres bloques visibles tienen scopes React
de desarrollo; `measure:renders` acepta `E2E_VITE_PORT` para no ocupar el puerto
de otro proyecto.

## Perfil CPU de producción

Tres visitas frías a Control horario con viewport 412×823 y CPU 4×. Antes es la
versión de Spec 098; después usa la imagen de esta spec.

| Medición                  |                     Spec 098 |                       Spec 099 final | Lectura                           |
| ------------------------- | ---------------------------: | -----------------------------------: | --------------------------------- |
| `useTimeRecordMutations`  |   11,47 ms muestreados (3/3) | no apareció como frame mapeado (0/3) | no significa CPU cero             |
| CPU activo mediano        | 787,922 ms (759,952–809,186) |       863,860 ms (765,164–1.887,768) | alta variación; rangos se solapan |
| React core propio mediano | 214,686 ms (199,924–214,911) |         236,114 ms (200,882–316,829) | no demuestra una mejora global    |
| Tareas largas por visita  |                      7, 6, 8 |                             15, 8, 7 | no bajan                          |

Las visitas finales capturaron 11, 12 y 12 requests API. Las 35 respuestas
capturadas fueron HTTP 200 y el perfil no registró fallos. En la muestra de 11
faltó `/api/shift-reports`; no se registró una respuesta fallida. La diferencia
de requests no se atribuye a este cambio. El código sí evita dos llamadas del
wrapper genérico en consumidores que solo leen. CPU, React propio y tareas
largas no muestran una mejora global.

## Lighthouse y renderizado

Cinco corridas frías de la imagen final dieron TBT mediano de 194,5 ms
(185,5–307 ms), frente a 163,5 ms (161–245 ms) en Spec 098. La mediana final es
19% mayor y los rangos se solapan; los datos no prueban ni una mejora ni una
regresión causal. Lighthouse marcó 2–3 requests API por corrida.

En los perfiles React de desarrollo, filtros, historial y panel se mantuvieron
en rangos parecidos entre antes y después. Sirven para atribución, no para
evaluar producción; la serie completa está guardada por separado.

## Validación

- 14/14 pruebas focalizadas de filtros y panel de marcación.
- Build de producción y reconstrucción de frontend staging completados; readiness `healthy` y gateway HTTP 200.
- TypeScript, ESLint, Prettier, spec check, docs check, lint budget 0/0 y preflight completo pasaron.
- Las 35 respuestas API capturadas en el perfil final fueron HTTP 200, sin fallos.

## Evidencia

- [Perfil CPU posterior](./time-control-production-cpu-after-2026-10-25.json)
- [Lighthouse posterior](./time-control-lighthouse-after-2026-10-25.json)
- [Scopes React de desarrollo](./time-control-render-scopes-2026-10-25.json)
- [Comparación Lighthouse base Spec 098](../../098-time-control-slim-schedule-enrichment/evidencia/time-control-lighthouse-after-2026-10-25.json)
- [Comparación CPU base Spec 098](../../098-time-control-slim-schedule-enrichment/evidencia/time-control-production-cpu-after-2026-10-25.json)
