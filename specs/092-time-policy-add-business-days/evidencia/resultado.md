# Resultado Spec 092: reutilizar formatter al sumar días de negocio

## Cambio y validación funcional

`addBusinessDaysCL` conserva intactos el parseo, el mediodía UTC y el ajuste con
`setUTCDate`; solo delega su formato final en `formatBusinessDateCL`. El parser
general `formatInTimeZone` ya no se ejecuta en este camino.

Los tests comparan fechas del siglo XX, años bisiestos, transiciones de
calendario, verano/invierno y desplazamientos de −400 a +400 días con la salida
de `date-fns-tz`. Pasaron 10/10 tests, TypeScript y ESLint dirigido.

Una comparación determinista local cubrió 350 pares fecha/desplazamiento. Siete
rondas de 50.000 operaciones dieron medianas de 620,00 ms con
`formatInTimeZone` y 219,12 ms con el formatter compartido (−64,7 % en ese
microbenchmark). No representa un ahorro equivalente de TBT.

## Perfil CPU de staging

La base fue la captura de Spec 091, con frontend
`sha256:cdb23d268d828bafcfa6fecb18841dece2d97f2182229cab659b14ce08a9b02c`.
La nueva imagen es
`sha256:3bd09bf5baa0c7aa6208f73059d811407987842737a2b45c025d48a802049db3`.
Se usaron tres perfiles de producción de `/#/time-control`, viewport 412×823,
CPU 4× y source maps con cobertura de 100 % en todas las muestras.

| Medida                             |           Spec 091 |           Spec 092 | Observación                 |
| ---------------------------------- | -----------------: | -----------------: | --------------------------- |
| `addBusinessDaysCL` muestreado     |           6,978 ms | No apareció en 3/3 | No equivale a cero CPU      |
| `formatBusinessDateCL` muestreado  | No apareció en 3/3 | No apareció en 3/3 | Sin muestra en ambas tandas |
| CPU activo muestreado mediano      |         792,496 ms |         793,710 ms | +1,214 ms                   |
| React inclusivo muestreado mediano |         513,682 ms |         499,563 ms | −14,119 ms                  |
| React propio muestreado mediano    |         198,133 ms |         199,367 ms | +1,234 ms                   |
| Solicitudes API por navegación     |                 12 |                 12 | Igual                       |
| Respuestas HTTP 200                |              36/36 |              36/36 | Sin fallas                  |

La función objetivo dejó de recibir muestras. El CPU activo mediano quedó casi
igual y el resto de métricas oscila; son tandas secuenciales de tres muestras,
por lo que no se atribuye el cambio agregado al formato.

## Lighthouse frío

Cinco corridas con Lighthouse 12.6.1, mobile 412×823, CPU 4× y RTT simulado de
150 ms, comparadas con Spec 091:

| Métrica                     |               Spec 091 |           Spec 092 |         Cambio observado |
| --------------------------- | ---------------------: | -----------------: | -----------------------: |
| Score mediano               |                   0,94 |               0,92 |                    −0,02 |
| TBT mediano                 | 203 ms (177,5–1.099,5) | 232 ms (133,5–269) | +29 ms; rangos solapados |
| FCP mediano                 |            2.005,69 ms |        2.008,39 ms |                 +2,70 ms |
| LCP mediano                 |            2.255,53 ms |        2.253,43 ms |                 −2,10 ms |
| CLS mediano                 |                      0 |             0,0102 |                  +0,0102 |
| JS transferido mediano      |              301.047 B |          301.040 B |                     −7 B |
| Transferencia total mediana |              463.982 B |          463.992 B |                    +10 B |
| Solicitudes medianas        |                     85 |                 85 |                    Igual |

No se observa una mejora estable de TBT: la mediana subió 29 ms y los rangos se
solapan. FCP y LCP variaron menos de 3 ms; la transferencia de JS y solicitudes
permaneció igual en la práctica.

## Staging y siguiente foco

La imagen frontend quedó saludable; backend, API y base de datos continuaron
saludables. Las 36 solicitudes de los perfiles fueron GET con HTTP 200.

El frame de mayor coste de aplicación en el perfil actual es
`apiClient.performRequest`, con una mediana de 40,917 ms en tres muestras. El
siguiente paso es inspeccionar qué trabajo síncrono queda dentro de esa función
y separarlo de la espera de red antes de retirar o diferir otra lectura.
