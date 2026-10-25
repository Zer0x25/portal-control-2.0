# Resultado Spec 090: diferir consulta de filtros colapsados en móvil

## Cambio

`TimeRecordFilters` conserva su consulta de registros al mostrar los filtros en
desktop. En móvil, donde el panel comienza cerrado, la consulta queda
deshabilitada hasta que el usuario lo expande. No cambian los parámetros, el
tamaño de página ni la consulta de la tabla, y no se editó `TimeControl.view.tsx`.

La captura React de desarrollo anterior al cambio registró 27 commits medianos
en `app:application`, 7 en la ruta y 6 en la vista. Son scopes anidados; sirven
para describir el árbol, no para sumar tiempos ni para comparar con producción.
El perfil API de Spec 089 y el call site de `TimeRecordFilters` identificaron la
lectura auxiliar de registros como el trabajo que se podía diferir sin ocultar
una consulta visible.

## Pruebas y staging

Los tests se escribieron primero y fallaron con el fetch incondicional. Después
pasaron 6/6 para móvil colapsado, móvil expandido y desktop. TypeScript y ESLint
dirigidos también pasaron.

La imagen frontend de staging es
`sha256:d759f55a9e4af066116b13567b8c0575a8e9e0d32988a5eb4ed5db99520827e6`; API,
base de datos y frontend permanecieron saludables. Tres perfiles de producción
coincidieron con mapas de fuente en 208/208 scripts:

| Medida por navegación móvil  | Spec 089 | Spec 090 | Cambio |
| ---------------------------- | -------: | -------: | -----: |
| Solicitudes API              |       13 |       12 |     −1 |
| `/api/records`               |        2 |        1 |     −1 |
| Respuestas exitosas/fallidas |   13 / 0 |   12 / 0 |      — |

Las 36 solicitudes API de los tres perfiles terminaron con HTTP 200. Los
timestamps de red estuvieron fuera de orden y se omitieron sus duraciones. La
prueba directa de navegador confirmó una lectura de registros al entrar en móvil;
al expandir filtros se produjo la segunda llamada con HTTP 200. En desktop ambas
lecturas siguen ejecutándose al montar. No hubo errores de página ni respuestas
API fallidas, y no se hicieron escrituras de negocio.

## Lighthouse frío

Cinco corridas móviles en staging, Lighthouse 12.6.1, CPU 4×, RTT simulado de
150 ms y viewport 412×823. El backend se mantuvo igual.

| Métrica                                 |             Spec 089 |           Spec 090 |                                    Observación |
| --------------------------------------- | -------------------: | -----------------: | ---------------------------------------------: |
| TBT mediano                             | 220 ms (211,5–264,7) | 189 ms (154–677,5) | −31 ms (−14,1 %); un valor atípico de 677,5 ms |
| FCP mediano                             |          2.005,11 ms |        2.026,23 ms |                             +21,12 ms (+1,1 %) |
| LCP mediano                             |          2.255,19 ms |        2.255,37 ms |                                       +0,18 ms |
| Transferencia JS mediana                |            300.841 B |          300.906 B |                                          +65 B |
| Solicitudes totales Lighthouse, mediana |                   85 |                 85 |                                     sin cambio |

Tres de cinco nuevas muestras quedaron bajo 200 ms de TBT; dos superaron ese
umbral y una alcanzó 677,5 ms. El rango nuevo incluye y supera al anterior. La
mediana menor es una señal observada, no una reducción causal atribuible a esta
consulta. FCP y LCP quedaron prácticamente estables.

El CPU activo muestreado subió de 770,528 a 805,722 ms y React inclusivo de
492,010 a 515,060 ms entre perfiles secuenciales de tres muestras. No se toma
esa variación como regresión ni como prueba de efecto del cambio.

## Siguiente foco

El ahorro verificado es una solicitud API durante la carga móvil inicial; al
abrir los filtros, la consulta sigue disponible. Lighthouse no demuestra una
mejora estable de TBT. El perfil de producción mantiene actividad distribuida en
`react-core`; antes de editar componentes, hay que identificar la próxima
consulta o subárbol que se repita en las tareas largas.

- [Perfil React previo en Vite dev](./time-control-react-startup-profile-2026-10-25.json)
- [Tres perfiles CPU de producción](./time-control-production-cpu-after-2026-10-25.json)
- [Cinco corridas Lighthouse](./time-control-lighthouse-after-2026-10-25.json)
