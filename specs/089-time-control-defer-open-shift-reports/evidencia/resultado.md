# Resultado Spec 089: diferir informes abiertos de turno

## Cambio

`useTimeControlModals` ya no carga informes abiertos al montar Control horario.
La acción de agregar una novedad solicita la lista fresca y luego prepara el
borrador. Si la lista no contiene un turno abierto conserva el aviso existente;
si falla la solicitud muestra un error distinto. No se cambiaron contratos,
permisos ni backend.

## Perfiles de producción

Tres navegaciones frías por imagen, con Chromium 153, viewport 412×823, CPU 4×
y mapas de fuente coincidentes para 208/208 scripts. La comparación fue entre
las imágenes frontend `db6ba887` (Spec 088) y `c07b7b2c` (Spec 089), con el mismo
backend de staging.

| Medida por navegación              |   Spec 088 |   Spec 089 |  Cambio |
| ---------------------------------- | ---------: | ---------: | ------: |
| Solicitudes API                    |         14 |         13 |      −1 |
| `/api/shift-reports`               |          2 |          1 |      −1 |
| Respuestas API exitosas / fallidas |     14 / 0 |     13 / 0 |       — |
| CPU activo muestreado mediano      | 836,901 ms | 770,528 ms |  −7,9 % |
| CPU inclusivo muestreado de React  | 538,080 ms | 492,010 ms |  −8,6 % |
| CPU muestreado de `performRequest` |  63,813 ms |  51,591 ms | −19,2 % |

Las solicitudes llegaron con timestamps de red fuera de orden en ambos perfiles;
no se usan sus duraciones. Los perfiles son secuenciales y de tres muestras, por
lo que los cambios de CPU son señales asociadas, no atribución causal del código.

## Comprobación funcional en staging

Al entrar a `#/time-control` se observó una llamada inicial a informes abiertos;
al pulsar la acción se realizó la segunda y ambas respondieron HTTP 200. Las
pruebas del hook confirman que no se consulta al montar, que el turno disponible
prepara el estado del borrador, que una lista vacía mantiene el aviso y que un
fallo de red no se presenta como ausencia de turno. No se realizaron escrituras
de negocio.

## Lighthouse frío

Cinco corridas móviles en staging, Lighthouse 12.6.1, CPU 4×, RTT simulado de
150 ms y viewport 412×823. Frente a las cinco corridas inmediatamente anteriores:

| Métrica                                 |            Antes |             Spec 089 |              Observación |
| --------------------------------------- | ---------------: | -------------------: | -----------------------: |
| TBT mediano                             | 239 ms (211–271) | 220 ms (211,5–264,7) | −19 ms; rangos solapados |
| FCP mediano                             |      2.109,12 ms |          2.005,11 ms |      −104,01 ms (−4,9 %) |
| LCP mediano                             |      2.468,79 ms |          2.255,19 ms |      −213,60 ms (−8,7 %) |
| Transferencia JS mediana                |        300.739 B |            300.841 B |                   +102 B |
| Solicitudes totales Lighthouse, mediana |               85 |                   85 |               sin cambio |

La dirección de TBT, FCP y LCP fue favorable en estas corridas, pero no hubo
comparación A/B intercalada y el rango de TBT se solapa con el anterior. No se
atribuye al cambio una reducción comprobada de TBT. Las cinco nuevas muestras
siguen sobre 200 ms.

## Límites y siguiente paso

La evidencia confirma el ahorro de una solicitud API por visita. `react-core`
aún concentra 492,010 ms inclusivos en el perfil muestreado, pero esa cifra no
identifica qué componente causó las tareas largas. El siguiente paso será
correlacionar tareas largas y commits de React por subárbol antes de escoger otra
modificación funcional.

- [Perfil CPU de producción Spec 088](../../088-time-control-scheduling-query-scope/evidencia/time-control-production-cpu-after-2026-10-25.json)
- [Tres perfiles CPU Spec 089](./time-control-production-cpu-after-2026-10-25.json)
- [Cinco corridas Lighthouse Spec 089](./time-control-lighthouse-after-2026-10-25.json)
