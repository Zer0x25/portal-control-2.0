# Resultado: diferir helpers de fecha del arranque

## Cambio

`useScheduling` ahora usa un parser ISO-UTC pequeño para sus diferencias síncronas de días. `useEmployees` carga `dateUtils` al archivar, y `useShiftManager` carga `formatters` y `dateUtils` solo al crear un turno. Los formatos de esas acciones permanecen iguales.

La prueba E2E escrita antes del cambio falló en staging y capturó los tres chunks que se cargaban prematuramente: `dateUtils`, `date-utils` y `formatters`. Un perfil CDP diagnóstico de la versión base había atribuido 105,62 ms de ejecución propia al chunk `date-utils` con CPU 4×.

## Verificación del arranque

En la navegación autenticada a `/#/dashboard`, viewport 1440×900:

| Medición Playwright                |   Antes | Después |  Cambio |
| ---------------------------------- | ------: | ------: | ------: |
| Solicitudes script                 |      76 |      74 |      −2 |
| Bytes transferidos por scripts     | 168.970 | 157.982 | −10.988 |
| Bytes de cuerpo codificado         | 153.929 | 141.678 | −12.251 |
| Chunks de fecha/formato prematuros |       3 |       0 |      −3 |

La prueba enfocada pasó con la imagen de staging final y confirmó que no se solicita ninguno de esos chunks durante el Dashboard.

## Lighthouse frío

Tres ejecuciones por versión en el staging local. Las cifras son medianas:

| Métrica                    | Base spec 044 |    Spec 045 |     Cambio |
| -------------------------- | ------------: | ----------: | ---------: |
| Score                      |          0,71 |        0,69 |      −0,02 |
| FCP                        |   3.759,76 ms | 3.705,70 ms |  −54,06 ms |
| LCP                        |   5.423,07 ms | 5.329,01 ms |  −94,06 ms |
| TBT                        |        108 ms |   182,50 ms |  +74,50 ms |
| CLS                        |             0 |           0 |          0 |
| Trabajo del hilo principal |   2.124,82 ms | 2.282,96 ms | +158,14 ms |
| CPU de `react-core`        |     974,70 ms | 1.195,65 ms | +220,95 ms |
| Solicitudes totales        |            88 |          86 |         −2 |
| Transferencia total        |     471.924 B |   458.765 B |  −13.159 B |
| Transferencia de scripts   |     308.409 B |   295.143 B |  −13.266 B |

Las tres muestras finales tuvieron FCP de 3.692–3.736 ms y LCP de 5.287–5.404 ms, rangos levemente por debajo de la base (3.750–3.779 ms y 5.416–5.553 ms). TBT, trabajo del hilo principal y CPU variaron en sentido contrario; esos rangos se solapan con los de la base. El score mediano bajó de 0,71 a 0,69. La mejora confirmada es menos chunks y bytes en la carga; esta tanda no demuestra una mejora global ni causal de CWV.

## Validación y límites

- Pruebas enfocadas: 29/29 entre parser, compatibilidad de `dateUtils`, inicio de turno y archivo de asignación.
- Suite frontend `validate:ci`: 174 archivos y 913 pruebas; lint 0/0, TypeScript, build y presupuesto de bundles pasaron.
- E2E de chunks en staging: pasó; gateway y API respondieron 200.
- Staging frontend: `sha256:e82c07b90d7f53437a3df7f5da691a86c681e0ec878fbbc57c9cd917d1895921`.
- Comparación completa por ejecución: [comparison.json](./comparison.json). Captura Playwright: [dashboard-eager-chunks.json](./dashboard-eager-chunks.json).
- El trabajo de React y el hilo principal sigue siendo variable y alto. La siguiente investigación puede separar qué consultas de programación inicia el shell para roles que no ejecutan el auto-inicio de turno.
