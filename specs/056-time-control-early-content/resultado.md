# Resultado 056: mostrar antes el contenido de Control horario

## Cambio

`useTimeControlData` ya no bloquea toda la página por la consulta de marcaciones. La configuración sigue controlando el gate de `isPageLoading`, y la tabla conserva `isLoading` para su estado de carga. `TimeControl.view.tsx` quedó intacta.

## Verificación funcional

- La prueba roja reprodujo el caso anterior: con `isLoading=true` y configuración lista, el hook devolvía `isPageLoading=true`.
- Después del cambio, las pruebas de hook y vista pasan 7/7, incluyendo el caso en que la configuración sigue cargando.
- Tras reconstruir el frontend de staging, una prueba Playwright en viewport móvil 412×823 y CPU 4× retuvo GET `/api/records`. En la captura, la petición estaba pendiente a los 2.062 ms; el encabezado se renderizó a los 2.151 ms y quedó arriba del overlay a los 2.169 ms. `document.elementFromPoint` confirmó que el overlay no lo cubría, y la API seguía retenida. Evidencia: [`time-control-shell-before-records.json`](./evidencia/time-control-shell-before-records.json).
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

## Elemento que domina el LCP

En tres perfiles separados, el último candidato LCP fue un párrafo del `InitialSyncOverlay` (`Establishing technical handshake…`), con `startTime` de 1.560–1.784 ms. En otras tres capturas con CPU 4×, el overlay cubría el encabezado al primer hit-test y desapareció entre 1.958 y 2.381 ms mientras GET `/api/records` seguía pendiente. El tiempo del overlay varía entre sesiones; por eso los LCP de arranque frío incluyen la sincronización inicial y no aíslan el render de la ruta. El perfil reproducible está en [`time-control-initial-sync-overlay-2026-10-24.json`](./evidencia/time-control-initial-sync-overlay-2026-10-24.json).

La prueba E2E ahora espera la retirada del overlay y comprueba el elemento superior en el centro del encabezado. Así verifica visibilidad real del shell cuando la consulta de marcaciones todavía no responde.

El registro completo está en [`2026-10-24T08-58-04-237Z-faa79842.json`](../039-frontend-performance-battery/evidencia/runs/2026-10-24T08-58-04-237Z-faa79842.json). La fuente de esa corrida tenía cambios locales aún sin commit (`workingTreeDirty=true`); el frontend de staging sí fue reconstruido con ellos. Imagen: `sha256:88fa33758435e8e667fcaea1bd6659e8b2ff161da4fb01a3f8bcc60d8fdddc4d`.

## Siguiente foco

El shell queda visible antes de que respondan las marcaciones, aunque `InitialSyncOverlay` puede cubrirlo durante la sincronización inicial. El próximo paso es medir por separado el arranque con sincronización fría y la navegación autenticada ya sincronizada antes de cambiar el overlay o atribuir LCP a una ruta.
