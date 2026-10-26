# Resultado Spec 091: formatear fecha de negocio con Intl reutilizable

## Cambio

`formatBusinessDateCL` conserva la zona `America/Santiago`, el calendario
gregoriano, los dígitos latinos y la salida `yyyy-MM-dd`. Ahora obtiene año,
mes y día con un `Intl.DateTimeFormat` reutilizado, creado al primer uso. No se
cambiaron consumidores, consultas, componentes ni contratos.

Los tests cubren medianoche de verano e invierno, el año 0099, 370 fechas
deterministas comparadas con `date-fns-tz`, el reloj de negocio sincronizado y
`Invalid Date`. Pasaron 9/9 tests, typecheck y ESLint dirigido.

## Microbenchmark local

Siete rondas de 50.000 conversiones en Node 26.10.0 dieron estos tiempos
medianos para la función de referencia y la variante con formatter reutilizado:

| Variante           |   Mediana |  Cambio |
| ------------------ | --------: | ------: |
| `formatInTimeZone` | 511,96 ms |       — |
| `Intl` reutilizado | 137,44 ms | −73,2 % |

Es un microbenchmark del runtime local; no representa por sí mismo un ahorro
equivalente de TBT ni de tiempo percibido.

## Perfiles CPU de producción

Staging servía la imagen base exacta de Spec 090
(`sha256:d759f55a9e4af066116b13567b8c0575a8e9e0d32988a5eb4ed5db99520827e6`).
La nueva imagen frontend es
`sha256:cdb23d268d828bafcfa6fecb18841dece2d97f2182229cab659b14ce08a9b02c`.
Ambos perfiles usaron tres navegaciones frías de `/#/time-control`, viewport
412×823 y CPU 4×. La cobertura de source maps fue 100 % en la base y 99,79–100 %
después.

| Medida del perfil                       |   Spec 090 |           Spec 091 | Observación            |
| --------------------------------------- | ---------: | -----------------: | ---------------------- |
| Muestras con solicitud API fallida      |        0/3 |                0/3 | Sin fallas             |
| Solicitudes API medianas por navegación |         12 |                 12 | Igual                  |
| `formatBusinessDateCL` muestreado       |  13,466 ms | No apareció en 3/3 | No equivale a cero CPU |
| CPU activo muestreado mediano           | 805,722 ms |         792,496 ms | −13,226 ms             |
| React inclusivo muestreado mediano      | 515,060 ms |         513,682 ms | −1,378 ms              |
| React propio muestreado mediano         | 198,526 ms |         198,133 ms | −0,393 ms              |

La función dejó de recibir muestras de CPU en esta captura; el total activo
mediano también bajó. Son grupos secuenciales de tres perfiles, no una prueba
aleatoria A/B; no se atribuye al cambio todo el movimiento agregado.

## Lighthouse frío

Cinco corridas en Lighthouse 12.6.1, mobile 412×823, CPU 4× y RTT simulado de
150 ms. Se comparan con las cinco corridas de Spec 090:

| Métrica                     |           Spec 090 |               Spec 091 |                            Cambio observado |
| --------------------------- | -----------------: | ---------------------: | ------------------------------------------: |
| Score mediano               |               0,91 |                   0,94 |                                       +0,03 |
| TBT mediano                 | 189 ms (154–677,5) | 203 ms (177,5–1.099,5) | +14 ms; rangos solapados y un valor atípico |
| FCP mediano                 |        2.026,23 ms |            2.005,69 ms |                                   −20,54 ms |
| LCP mediano                 |        2.255,37 ms |            2.255,53 ms |                                    +0,16 ms |
| CLS mediano                 |             0,0102 |                      0 |                                     −0,0102 |
| JS transferido mediano      |          300.906 B |              301.047 B |                                      +141 B |
| Transferencia total mediana |          463.827 B |              463.982 B |                                      +155 B |
| Solicitudes medianas        |                 85 |                     85 |                                       Igual |

La nueva tanda tuvo un TBT atípico de 1.099,5 ms. Su rango se solapa con la base
y su mediana subió; no hay evidencia de mejora estable de TBT atribuible a este
cambio. FCP y LCP permanecen cerca de la base.

## Resultado de staging y siguiente foco

La API, base de datos, backend y frontend quedaron saludables tras reconstruir
la imagen frontend. Las 36 solicitudes API de los tres perfiles terminaron en
HTTP 200.

El próximo candidato medido es `addBusinessDaysCL`, con una mediana de 6,978 ms
muestreados en la nueva captura. Primero hay que comprobar sus invariantes de
calendario y llamadas antes de decidir otra optimización.
