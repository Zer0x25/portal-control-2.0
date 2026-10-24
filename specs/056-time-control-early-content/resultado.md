# Resultado 056: mostrar antes el contenido de Control horario

## Cambio

`useTimeControlData` ya no bloquea toda la página por la consulta de marcaciones. La configuración sigue controlando el gate de `isPageLoading`, y la tabla conserva `isLoading` para su estado de carga. `TimeControl.view.tsx` quedó intacta.

## Verificación funcional

- La prueba roja reprodujo el caso anterior: con `isLoading=true` y configuración lista, el hook devolvía `isPageLoading=true`.
- Después del cambio, las pruebas de hook y vista pasan 7/7, incluyendo el caso en que la configuración sigue cargando.
- Tras reconstruir el frontend de staging, una prueba Playwright retuvo GET `/api/records` en viewport móvil 412×823. La solicitud seguía pendiente cuando apareció «Control de Asistencia»: 947,51 ms para interceptar marcaciones y 1.006,54 ms hasta la cabecera. Evidencia: [`time-control-shell-before-records.json`](./evidencia/time-control-shell-before-records.json).
- La batería completa pasó 15/15 pruebas E2E; la nueva prueba reteniendo la API pasó 1/1 adicional. Las 18 rutas de readiness, tres muestras cada una, pasaron. Lighthouse estándar aprobó 85/85 aserciones en 17 rutas.

## Lighthouse frío de Control horario

| Métrica                    | Antes, Spec 039 | Después del rebuild | Cambio de medianas |
| -------------------------- | --------------: | ------------------: | -----------------: |
| Lighthouse LCP             |        5.486 ms |            5.391 ms |             −95 ms |
| LCP observado              |        1.661 ms |            1.618 ms |             −43 ms |
| Demora observada de render |        1.658 ms |            1.616 ms |             −42 ms |
| TBT                        |        257,5 ms |              190 ms |           −67,5 ms |
| Score de rendimiento       |            0,66 |                0,69 |              +0,03 |

Cada versión tiene tres muestras. Los rangos de LCP observado y TBT se solapan; el post-rebuild también tuvo un LCP observado de 755 ms y dos resultados de 1.618/1.696 ms. Por tanto, la evidencia confirma que el contenido se muestra antes de terminar la consulta, pero todavía no confirma una mejora estable de Core Web Vitals.

El registro completo está en [`2026-10-24T08-58-04-237Z-faa79842.json`](../039-frontend-performance-battery/evidencia/runs/2026-10-24T08-58-04-237Z-faa79842.json). La fuente de esa corrida tenía cambios locales aún sin commit (`workingTreeDirty=true`); el frontend de staging sí fue reconstruido con ellos. Imagen: `sha256:88fa33758435e8e667fcaea1bd6659e8b2ff161da4fb01a3f8bcc60d8fdddc4d`.

## Siguiente foco

Con el gate de datos retirado, el LCP aún queda alrededor de 1,6 s observado y el CPU de `react-core` continúa cerca de 1,37 s en el trace simulado. El próximo paso es perfilar el arranque de producción y localizar ese trabajo antes de intentar otra optimización.
