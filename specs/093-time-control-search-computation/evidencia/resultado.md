# Resultado Spec 093: cálculo diferido de resultados del buscador

## Cambio funcional

`useClockingPanel` ahora memoriza los resultados por empleados, término y
selección. Retorna una lista vacía sin normalizar, filtrar ni ordenar cuando el
buscador no tiene texto o ya existe una selección; la lista de opciones solo se
monta durante una búsqueda activa. Coincidencias sin tildes, orden por nombre,
selección y acciones de marcaje se conservan.

La primera hipótesis de esta spec fue aplazar la consulta de empleados hasta el
foco. Se descartó antes de cerrar el cambio: `useLoginAutomations` usa el mismo
catálogo para decidir si un usuario puede ejecutar el auto inicio de jornada.
La captura exploratoria mostró `/api/employees/clocking-options` en las tres
navegaciones y los datos de turnos también cargándose. La query del hook de
búsqueda no podía apagarse globalmente sin alterar ese flujo. El código final no
cambia la query ni la automatización.

## Tests y staging

Los tests dirigidos pasaron **8/8**; cubren búsqueda vacía, coincidencias con
tildes, orden alfabético, selección, estado y mutación de marcaje. También
pasaron TypeScript, ESLint dirigido y `spec:check`.

Solo se reconstruyó el frontend de staging. La imagen candidata es
`sha256:f1693ef54d39cb41973604270a77a529b2f8191a905f84d92034341f13cfc471`.
Frontend, backend, gateway, PostgreSQL y PgBouncer quedaron saludables. Los tres
perfiles usaron Chromium 153, viewport 412×823, CPU 4× y source maps coincidentes
en 208/208 scripts. Las 36 solicitudes API respondieron HTTP 200.

| Señal por navegación                      |  Perfil anterior |               Perfil candidato | Observación                                           |
| ----------------------------------------- | ---------------: | -----------------------------: | ----------------------------------------------------- |
| Callback de filtro/orden en tareas largas | 21,505 ms en 2/3 | No aparece como frame repetido | El cálculo se omite hasta buscar.                     |
| CPU activo muestreado mediano             |       864,348 ms |                     788,183 ms | −8,8%; perfiles secuenciales, sin atribución causal.  |
| React inclusivo muestreado mediano        |       559,581 ms |                     493,806 ms | −11,8%; perfiles secuenciales, sin atribución causal. |
| Tareas largas por perfil, mediana         |                9 |                              6 | Variación observada, no causal.                       |
| Solicitudes API                           |               12 |                             12 | Sin cambio; catálogo cargado para auto inicio.        |

La lectura del perfil antes del cambio encontró el callback anónimo en tareas
largas en dos muestras, con 21,505 ms muestreados medianos. Después, el frame
del hook aparece con 2,73 ms en dos muestras y el callback de filtrado dejó de
aparecer entre los frames repetidos de esas tareas. Los perfiles miden CPU
muestreado; no equivalen a TBT.

## Lighthouse frío

Cinco corridas Lighthouse 12.6.1, móvil 412×823, CPU 4× y RTT simulado de 150
ms. Se comparan con la imagen registrada por Spec 092:

| Métrica                      |           Spec 092 |            Spec 093 | Observación                                                  |
| ---------------------------- | -----------------: | ------------------: | ------------------------------------------------------------ |
| TBT mediano                  | 232 ms (133,5–269) | 190 ms (134–626,03) | Rangos solapados y un outlier; no se declara mejora estable. |
| FCP mediano                  |        2.008,39 ms |         2.012,02 ms | +0,18%.                                                      |
| LCP mediano                  |        2.253,43 ms |         2.253,92 ms | +0,02%.                                                      |
| CLS máximo                   |             0,0102 |                0,01 | Sin regresión.                                               |
| JS transferido mediano       |          301.040 B |           301.065 B | +25 B.                                                       |
| Requests Lighthouse, mediana |                 85 |                  85 | Igual.                                                       |

El cambio cumple el criterio de costo del callback y de no regresión de FCP,
LCP y CLS. **No hay evidencia de una mejora estable de TBT**: su mediana bajó,
pero el rango creció hasta 626,03 ms y se solapa con la base.

## Siguiente foco medido

En el perfil candidato siguen apareciendo `App.tsx` en los importadores lazy de
`PersistentLayout` y `TimeControlPage` en 3/3 muestras, con 17,775 y 15,1 ms
muestreados medianos dentro de tareas largas. `apiClient.performRequest` también
reaparece (30,309 ms, 2/3). El siguiente diagnóstico debe comprobar si la carga
lazy de layout y ruta se serializa y qué parte de esos frames cae dentro de
tareas largas; aún no hay una modificación segura justificada para el cliente
HTTP.

- [Perfil CPU antes](./time-control-production-cpu-before-2026-10-25.json)
- [Perfil CPU candidato](./time-control-production-cpu-after-2026-10-25.json)
- [Cinco corridas Lighthouse](./time-control-lighthouse-after-2026-10-25.json)
- [Baseline Lighthouse Spec 092](../../092-time-policy-add-business-days/evidencia/time-control-lighthouse-after-2026-10-25.json)
