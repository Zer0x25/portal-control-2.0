# Resultado Spec 096: diferir filtros móviles contraídos

- Estado: descartado después de medir en staging.
- Fecha: 2026-10-25.
- Imagen candidata del frontend: `sha256:15d182eb9f5596d3eff85178a9137d1d2c7a05924b8639c8300f2241fb0fc646`.
- Imagen actual de staging tras el rollback: `sha256:162528dc0b4abe44826e65d7eba23fd0a52b78341c2d00ad673aaa00ba6ec2b7`.
- Tras restaurar, el chunk candidato respondió HTTP 404, el chunk aceptado de
  Control horario HTTP 200 y la API readiness `healthy`.

## Resultado funcional

El test rojo inicial confirmó que, aunque la grilla estuviera invisible, los
controles seguían en el DOM y sus hooks se ejecutaban. En la variante diferida:

- Móvil contraído: cero campos de filtro y cero solicitud de su chunk.
- Al abrir: el navegador solicitó una vez `TimeRecordFilterControls`; los
  filtros quedaron accesibles.
- Al seleccionar `Ordinaria` y cambiar la fecha, ambos valores sobrevivieron a
  cerrar y volver a abrir.
- Escritorio mantuvo los controles disponibles al entrar.
- Vitest focalizado: 11/11; TypeScript y build de producción pasaron.
- E2E funcional del filtro: pasó. La batería de tres visitas falló solo en el
  umbral de transferencia de AC4.

## Medición y decisión

| Métrica                          | Base Spec 095 | Candidata Spec 096 |                 Diferencia |
| -------------------------------- | ------------: | -----------------: | -------------------------: |
| Transferencia JavaScript inicial |     200.553 B |          196.512 B |           −4.041 B (−2,0%) |
| Recursos JavaScript iniciales    |            67 |                 66 |                         −1 |
| Requests API por visita          |            12 |                 12 | sin cambio; 36/36 HTTP 200 |

Las tres muestras candidatas registraron 196.512 B y ninguna descargó el chunk
de filtros antes de expandir. El ahorro quedó 959 B bajo el mínimo de 5.000 B
definido en AC4, así que la implementación se revirtió.

En el perfil CDP, CPU activo muestreado mediano pasó de 790,952 a 736,403 ms;
sin embargo, las muestras individuales se solapan (base 730,827–799,163 ms;
candidata 731,132–759,216 ms). React core propio quedó prácticamente igual:
189,664 frente a 190,376 ms; ambos perfiles registraron siete tareas largas por
muestra. La variante ya no mostró el frame de `useBusinessNow` usado por el
filtro, pero esta evidencia no demuestra una mejora global estable ni de TBT.
No se ejecutó Lighthouse para esta prueba.

La propuesta queda descartada en su forma actual. Puede revisitarse si se
agrupa con otro subárbol móvil que permita superar el umbral sin introducir una
espera perceptible al abrir los filtros.

## Evidencia

- [`time-control-mobile-filter-defer.json`](./time-control-mobile-filter-defer.json)
- [`time-control-route-chunk-waterfall.json`](./time-control-route-chunk-waterfall.json)
- [`time-control-production-cpu-after-2026-10-25.json`](./time-control-production-cpu-after-2026-10-25.json)
- Línea base: [cascada Spec 095](../../095-theme-bootstrap-idempotency/evidencia/time-control-route-chunk-waterfall.json)
  y [perfil CDP Spec 095](../../095-theme-bootstrap-idempotency/evidencia/time-control-production-cpu-after-2026-10-25.json).
