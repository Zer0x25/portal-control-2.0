# Resultado Spec 103 — conservar el runtime con una ganancia observada de TBT

Fecha: 2026-10-25. Ruta: `/#/time-control`. Se comparó la base `533780d` con
el candidato frontend `f0ceced`; las diez corridas Lighthouse usaron el mismo
backend `3dfd554` y la misma base de datos staging. La comparación completa,
con las cinco corridas y cuatro perfiles CPU, está en
[`comparison-2026-10-25.json`](./comparison-2026-10-25.json).

## Cambio

`App` ya observa `is_control_interno_enabled` para construir las rutas. Ahora
pasa ese mismo valor y su estado `isLoading` a `TimeControlContainer`; el hook
de Control horario deja de crear el segundo observador. La vista recibe los
mismos valores y conserva el bloqueo mientras carga la configuración. No se
cambiaron endpoints ni el modal de acción rápida.

La prueba de regresión falló antes del cambio con dos llamadas al hook bajo
StrictMode; después quedó en cero. También verifica configuración deshabilitada
y estado de carga. La ruta completó 12/12 solicitudes API en cada perfil CDP,
sin fallos.

## Comparación

Cinco corridas Lighthouse antes y después, Lighthouse 12.6.1, móvil frío, CPU
4× y RTT 150 ms:

| Métrica             |                         Base |                    Candidata |  Cambio mediano |
| ------------------- | ---------------------------: | ---------------------------: | --------------: |
| Performance         |             0,93 (0,82–0,95) |             0,93 (0,75–0,96) |         estable |
| TBT                 |         216,5 ms (141–436,5) |           184 ms (129,5–343) |      **−15,0%** |
| LCP                 | 2.255,4 ms (2.253,1–3.436,6) | 2.255,9 ms (2.255,2–5.243,0) |          +0,02% |
| FCP                 | 2.034,0 ms (1.994,1–2.626,3) | 2.033,6 ms (2.000,9–2.710,5) |          −0,02% |
| CLS                 |          0,01016 (0–0,01016) |          0,01016 (0–0,01016) |         estable |
| Transferencia total |  457.635 B (457.619–493.421) |  457.795 B (457.778–493.550) | +0,03% (+160 B) |

TBT cumple la mejora mediana mínima de 5%; LCP y transferencia quedan muy por
debajo del máximo de regresión de 5%. Los rangos TBT/LCP se solapan y cada
serie tiene un valor atípico de LCP. El resultado es una mejora observada en
estas cinco corridas; no demuestra causalidad.

Los perfiles CPU no confirman una reducción estable. En el primer par de tres
muestras, el candidato bajó CPU activo 1.192→804 ms y React propio 292,5→201,4
ms; en la repetición alternada subieron 739,5→770,2 ms y 200,5→235,1 ms,
respectivamente. La mediana de tareas largas fue 6 en base y 7 en candidato en
ese segundo par. El perfil React de desarrollo mostró más commits de ruta en el candidato
y sirve solo para atribución, no como medida de producción.

## Decisión y validación

Se conserva el cambio por el gate Lighthouse acordado y porque elimina una
suscripción redundante con paridad de valores probada. La conclusión es
acotada: **TBT mediano observado −15,0%; no hay evidencia de una reducción
estable de CPU propio**.

Pruebas focalizadas 5/5; TypeScript, ESLint y build de producción pasan. El
perfil CPU coincidió con los 210 assets del frontend activo; todas las
solicitudes registradas fueron HTTP 200 y la readiness final de staging fue
`healthy`. No se generaron marcaciones ni se modificó la base de datos.

Siguiente foco: atribuir las tareas largas que aún contienen React/DOM y
separarlas de `apiClient.performRequest`; no optimizar imports por su tiempo
inclusivo sin una traza que identifique trabajo síncrono propio.
