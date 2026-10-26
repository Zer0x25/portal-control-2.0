# Seguimiento Dashboard — cold start y primera optimización

Fecha: 2026-10-23. Target: staging local `http://127.0.0.1:8080`, Chromium 153, Lighthouse 12.6.1.

## Cambio medido

`Dashboard.container.tsx` ahora importa `QuickActionModal` y `EditTimestampModal` como componentes `React.lazy`, directamente desde sus archivos, y solo los monta cuando la interacción los abre. Antes el import del barrel `features/time-control` hacía que Dashboard pidiera el chunk completo `TimeControl.container` y módulos de esa ruta aunque ambos modales estuvieran cerrados. No se modificó la vista UI protegida ni se cambió el contrato HTTP.

La prueba Playwright reproduce la solicitud de scripts desde un contexto nuevo. Antes del cambio falló y registró `TimeControl.container-DSBYLQDU.js`; después pasó sin solicitar ese chunk. El build genera los chunks de modal para cargarlos bajo demanda. Staging tenía cero filas de personal presente sin horario asignado, por lo que no fue posible abrir el modal desde datos reales de staging en esta corrida.

## Tres corridas Lighthouse con storage limpio

Las dos series se ejecutaron en el mismo host, ruta y configuración de Lighthouse, con `disableStorageReset: false`. Cada celda muestra mediana y, entre paréntesis, las tres muestras en ms; solicitudes y bytes son medianas. El TBT es muy variable y se reporta para evitar ocultar una regresión.

| Métrica                        |                         Antes |                       Después | Diferencia mediana |
| ------------------------------ | ----------------------------: | ----------------------------: | -----------------: |
| FCP                            | 5.234 (4.475 / 5.234 / 5.250) | 4.959 (4.459 / 4.959 / 5.035) |   −275 ms (−5,3 %) |
| LCP                            | 7.954 (7.010 / 7.954 / 7.984) | 7.220 (6.663 / 7.226 / 7.220) |   −734 ms (−9,2 %) |
| TBT                            |         302 (302 / 299 / 390) |         203 (358 / 203 / 169) |   −99 ms (−32,7 %) |
| Score de rendimiento           |     0,56 (0,59 / 0,56 / 0,53) |     0,60 (0,57 / 0,60 / 0,61) |              +0,04 |
| Solicitudes totales            |                           122 |                            97 |      −25 (−20,5 %) |
| Solicitudes de scripts         |                            99 |                            84 |      −15 (−15,2 %) |
| Bytes transferidos por scripts |                       449.105 |                       409.699 |   −39.406 (−8,8 %) |
| Peso total transferido         |                       896.114 |                       833.302 |   −62.812 (−7,0 %) |

FCP y LCP mejoraron en mediana, aunque sus rangos se superponen; TBT varió mucho entre corridas y requiere más observaciones. Una tanda fría preliminar antes de integrar el perfil al runner dio FCP/LCP/TBT medianos de 4.480/7.229/382 ms, lo que confirma la variación de laboratorio. El recorte de solicitudes y bytes es consistente en ambos grupos con el chunk ausente. FCP y LCP todavía superan los límites actuales de 3 s y 4 s; el dashboard cold sigue abierto.

## Controles y siguiente prioridad

- La medición de preparación de ruta Playwright tuvo mediana de 577 ms después y 548 ms en la línea base; esta diferencia pequeña no demuestra una regresión.
- El scroll virtualizado de Governance tuvo p95 de 33,4 ms; 1 de 90 frames superó 50 ms (máximo 66,6 ms), lejos del límite severo de 250 ms.
- Lighthouse sigue mostrando unos 903 ms de ahorro estimado en el recurso CSS bloqueante de 35,9 KB y unos 101 KB de JavaScript no usado. El chunk `validation` todavía aparece en las solicitudes del Dashboard; la carga de la hoja CSS también continúa igual.
- Próxima investigación: separar la cadena crítica de CSS/fuentes y confirmar qué estilos se necesitan para pintar el LCP. Mantener el CSS como archivo externo; la regla de rendimiento prohíbe el inlining masivo.

## Verificación y límites

- `npm run staging:up`: reconstruyó y levantó los contenedores locales; health del gateway y API devolvió 200.
- `npm run perf:staging`: Playwright 4/4 y Lighthouse estándar completaron sus aserciones en las seis rutas; el comando también reunió tres muestras frías.
- Las tres muestras frías no pasan los límites globales de FCP/LCP; el perfil los registra sin alterar esos límites.
- `npm --prefix frontend run check`: pasó. El build de staging también completó.
- No se modificaron datos de negocio ni se desplegó fuera del staging local. La prueba valida que el chunk no se cargue al abrir Dashboard; el primer clic que abre cada modal queda pendiente porque staging no contenía un registro elegible.
