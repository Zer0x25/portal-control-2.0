# Resultado Spec 097: quitar observador contable sin consumidor

- Estado: completado y verificado en staging local.
- Fecha: 2026-10-25.
- Imagen frontend staging: `sha256:cbca2e53fc8575899e296159463d65edf5f0ed855004efc952406306cf669b36`.
- Backend, base de datos, PgBouncer y gateway no se reconstruyeron. El gateway
  respondió HTTP 200 y `/api/health/ready` devolvió `healthy`.

## Cambio y cobertura

Se eliminó de `useTimeControl` la llamada a `useAccountingLockDateQuery()` que
descartaba el resultado. Los dos consumidores reales siguen intactos:
`useTimeControlModals` aplica el bloqueo de acciones sobre registros cerrados y
`useTimeControlData` calcula `effectiveLockDate`.

La regresión focalizada falló antes del cambio al detectar la suscripción y
pasó después. Las pruebas de los cuatro hooks relacionados terminaron 13/13;
TypeScript frontend y ESLint de los archivos modificados pasaron.

## Resultado en staging

Tres visitas móviles frías conservaron las 12 solicitudes API por visita:
36/36 respuestas fueron HTTP 200 y `/api/configs/accounting_lock_date` se pidió
una vez en cada visita. El chunk de Control horario se solicitó una vez por
visita, se solapó con `PersistentLayout` y no se descargaron chunks del modal de
edición. La transferencia JS fue 200.550 B por visita frente a 200.553 B en la
base, diferencia de 3 B sin valor de optimización.

## Perfil y límite de la conclusión

| Medición CDP (3 muestras) |                Base Spec 095 |                     Spec 097 | Diferencia de medianas |
| ------------------------- | ---------------------------: | ---------------------------: | ---------------------: |
| CPU activo muestreado     | 790,952 ms (730,827–799,163) | 795,671 ms (779,396–828,619) |              +4,719 ms |
| Programa muestreado       | 766,976 ms (760,997–820,968) | 787,244 ms (787,038–806,775) |             +20,268 ms |
| React core propio         | 189,664 ms (184,477–209,625) | 210,726 ms (192,049–233,459) |             +21,062 ms |
| Tareas largas por visita  |            7 en cada muestra |            7 en cada muestra |             sin cambio |

Los rangos de CPU activo y React core se solapan. Los perfiles son secuenciales,
con tres muestras por versión y dos imágenes diferentes; no permiten aislar un
efecto causal ni afirmar una mejora de TBT. El beneficio comprobado es eliminar
un observador redundante sin cambiar requests, datos ni comportamiento. Se
conserva el cambio como simplificación del árbol de suscripciones, no como una
mejora global medida.

## Evidencia

- [`time-control-route-chunk-waterfall.json`](./time-control-route-chunk-waterfall.json)
- [`time-control-production-cpu-after-2026-10-25.json`](./time-control-production-cpu-after-2026-10-25.json)
- Base: [cascada Spec 095](../../095-theme-bootstrap-idempotency/evidencia/time-control-route-chunk-waterfall.json)
  y [perfil CDP Spec 095](../../095-theme-bootstrap-idempotency/evidencia/time-control-production-cpu-after-2026-10-25.json).
