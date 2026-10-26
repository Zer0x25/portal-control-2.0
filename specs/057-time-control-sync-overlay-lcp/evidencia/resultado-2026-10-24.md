# Resultado 057: animación del overlay de sincronización

## Decisión

Se rechaza el cambio visual y se restauran el fade de entrada de 800 ms y los pulsos decorativos. La bajada del LCP no alcanzó el mínimo definido en AC3. El overlay continúa cubriendo la aplicación hasta completar la sincronización.

## Lighthouse frío de Control horario

Las dos corridas usaron tres muestras, Lighthouse 12.6.1, Chromium 153, viewport 412×823 y perfil mobile con CPU 4×. El baseline es el rebuild anterior sin modificar el overlay. La corrida experimental quitó temporalmente el fade y los dos pulsos decorativos.

| Métrica (mediana)       |               Baseline |        Sin animaciones | Cambio |                    Umbral | Resultado |
| ----------------------- | ---------------------: | ---------------------: | -----: | ------------------------: | --------- |
| LCP observado del trace | 1.592 ms (1.545–1.592) |   1.549 ms (737–1.723) | −43 ms |   mejorar al menos 100 ms | No cumple |
| FCP observado del trace |       639 ms (599–641) |       646 ms (419–787) |  +7 ms | no empeorar más de 100 ms | Cumple    |
| TBT de Lighthouse       |     172,5 ms (122–199) | 248,5 ms (244,5–291,5) | +76 ms | no empeorar más de 100 ms | Cumple    |

La mediana del LCP cayó 43 ms (2,7%), frente a los 100 ms requeridos. El rango experimental es amplio y solapa el baseline; además, la primera muestra de 737 ms fue un valor atípico frente a las otras dos muestras (1.549 y 1.723 ms). Por la regla establecida, la mejora no es repetible y no se conserva el cambio. FCP y TBT cumplen sus límites individuales.

El registro basal [`2026-10-24T09-35-14-421Z-333e0846.json`](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T09-35-14-421Z-333e0846.json) tiene digest `sha256:88fa33758435e8e667fcaea1bd6659e8b2ff161da4fb01a3f8bcc60d8fdddc4d`. La medición experimental completa está en [`2026-10-24T10-01-29-292Z-efa823d3.json`](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T10-01-29-292Z-efa823d3.json), imagen `sha256:96c25102ce342744c0af4f46b96984ed15c8ec4cd44274fe07616925eb623e97`. La batería completa pasó: 18 rutas readiness con tres muestras, 17 rutas Lighthouse con 85/85 aserciones y tres muestras frías para Dashboard, Worker Portal y Control horario.

## Probe del overlay

El probe enfocado con las animaciones quitadas obtuvo FCP 696 ms de mediana (688–788) y candidato LCP 980 ms (968–1.056). Se conserva como diagnóstico, no como sustituto de Lighthouse ni como prueba causal. Sus datos están en [`time-control-initial-sync-overlay-no-animations.json`](./time-control-initial-sync-overlay-no-animations.json).

Tras restaurar las clases originales, el probe pasó en tres contextos: `lastSyncTime` estaba nulo al inicio; el overlay cubrió el viewport y ganó los hit-tests; los dos spinners y el porcentaje de progreso permanecieron visibles; y el overlay desapareció tras sincronizar. El candidato final fue el texto del log técnico, con LCP de 1.628, 1.760 y 1.812 ms (mediana 1.760 ms). FCP fue 784, 724 y 808 ms (mediana 784 ms). El estilo calculado volvió a `enter`/`0.8s`; el reporte de esta verificación está en [`time-control-initial-sync-overlay.json`](./time-control-initial-sync-overlay.json).

Este probe y Lighthouse miden capturas distintas; sus LCP no se mezclan en la tabla comparativa. La variación entre muestras refuerza que el fade no es el cuello de botella que conviene optimizar. El siguiente paso es medir por separado las fases de sincronización inicial que mantienen visible el overlay, sin relajar el bloqueo.

## Validación

- Batería completa contra el rebuild experimental: todas las fases pasaron; digest `sha256:96c25102ce342744c0af4f46b96984ed15c8ec4cd44274fe07616925eb623e97`.
- Rebuild posterior con estilos originales: frontend healthy, API health 200; probe enfocado 1/1 test con tres contextos pasó. Digest `sha256:0781f32e0b234c0828bf9feb04c11d73737f528261053ecff7004d080eb31bfd`.
- Typecheck, lint de frontend, preflight, validación de specs/documentación y formato: pasan.
