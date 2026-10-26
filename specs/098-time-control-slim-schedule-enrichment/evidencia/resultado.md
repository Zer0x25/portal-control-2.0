# Resultado Spec 098: simplificar el enriquecimiento de turnos

- Estado: implementado y verificado en staging local.
- Fecha: 2026-10-25.
- Imagen base: `sha256:cbca2e53fc8575899e296159463d65edf5f0ed855004efc952406306cf669b36`.
- Imagen candidata: `sha256:b62261e2d7814b8fd2a5a759c5d2f89eb507b2edbb61e40c7815107e72dc3efe`.
- Solo se reconstruyó frontend. Gateway HTTP 200 y API readiness `healthy`.

## Cambio

Control horario ya no instancia el `useScheduling` completo para obtener una
sola función de enriquecimiento diario. Ahora usa
`useTimeControlScheduleEnrichment`, que monta solo las queries de patrones,
asignaciones, feriados y permisos. Se extrajo el cálculo a
`useEmployeeDailyScheduleLookup` y se mantiene compartido con los consumidores
generales de `useScheduling`. La vista `TimeControl.view.tsx` no se modificó.

La ruta deja de montar observers deshabilitados de configuración, directorio de
empleados y correcciones, además de los hooks de mutación que no consume. El
comportamiento de permisos, feriados, patrón inválido, día libre, turno
programado y empleado sin perfil está cubierto con pruebas.

## Resultado Lighthouse

Se ejecutaron cinco corridas antes y cinco después con la misma ruta,
configuración local y flujo de autenticación. Solo cambió la imagen frontend.

| Métrica                      |                   Base (5) |              Candidata (5) |      Diferencia |
| ---------------------------- | -------------------------: | -------------------------: | --------------: |
| TBT mediano                  |       214,5 ms (210,5–423) |         163,5 ms (161–245) | −51 ms (−23,8%) |
| LCP mediano                  | 2.253,849 ms (2.252–5.338) | 2.255,088 ms (2.250–5.493) |         +0,055% |
| FCP mediano                  |               1.997,399 ms |               2.001,392 ms |          +0,20% |
| CLS mediano                  |                    0,01016 |                    0,01016 |      sin cambio |
| Score de rendimiento mediano |                       0,91 |                       0,93 |           +0,02 |

Cuatro de las cinco muestras candidatas de TBT quedaron bajo el mínimo de las
cinco muestras base; una candidata marcó 245 ms. La mediana satisface el umbral
de aceptación, aunque la cola superior todavía tiene variación.

## Perfil CPU y red

| Perfil CDP (3 muestras)   |                         Base |                    Candidata |
| ------------------------- | ---------------------------: | ---------------------------: |
| CPU activo mediano        | 802,148 ms (788,877–847,156) | 787,922 ms (759,952–809,186) |
| React core propio mediano | 209,326 ms (202,455–219,454) | 214,686 ms (199,924–214,911) |
| Tareas largas por muestra |                      6, 7, 7 |                      7, 6, 8 |

Los rangos de CPU activo y React propio se solapan; el perfil no demuestra una
reducción general de CPU. La mejora observada es específica del TBT Lighthouse
mediano y de la transferencia inicial: 200.550 → 195.755 B (−4.795 B, −2,4%)
y 67 → 66 recursos JavaScript. No se afirma que el refactor explique por sí
solo cada diferencia de una medición con cinco corridas secuenciales.

Tres visitas E2E conservaron 12 requests API cada una: 36/36 HTTP 200. Los
chunks de layout y Control horario siguieron solapándose; el modal de edición no
se descargó. Perfil CDP: 12 requests y cero errores en cada muestra.

## Validación

- 31/31 pruebas focalizadas de Control horario, lookup diario y `useScheduling`.
- TypeScript frontend, ESLint dirigido y build de producción pasaron.
- E2E de tres visitas frías: 1/1; reloj visible, mismo conteo de API y cero
  fallos HTTP.
- `spec:check` (98 specs), `docs:check` (488 Markdown) y preflight completo
  pasaron; ESLint budget backend/frontend 0/0.

## Evidencia

- [`time-control-lighthouse-before-2026-10-25.json`](./time-control-lighthouse-before-2026-10-25.json)
- [`time-control-lighthouse-after-2026-10-25.json`](./time-control-lighthouse-after-2026-10-25.json)
- [`time-control-route-chunk-waterfall.json`](./time-control-route-chunk-waterfall.json)
- [`time-control-production-cpu-before-2026-10-25.json`](./time-control-production-cpu-before-2026-10-25.json)
- [`time-control-production-cpu-after-2026-10-25.json`](./time-control-production-cpu-after-2026-10-25.json)
- Línea base de ruta/API: [waterfall Spec 097](../../097-time-control-remove-unused-accounting-lock-observer/evidencia/time-control-route-chunk-waterfall.json).
