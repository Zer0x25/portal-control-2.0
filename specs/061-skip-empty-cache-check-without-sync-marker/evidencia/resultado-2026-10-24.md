# Resultado Spec 061: omitir el chequeo de caché en el primer sync

## Captura

- Fecha: 2026-10-24, `2026-10-24T11:03:51.235Z`.
- Entorno: frontend staging reconstruido; `/#/time-control`; tres contextos autenticados nuevos; Chromium, 412×823, CPU 4×.
- Comparación: mismas condiciones y probe de Spec 060. El registro crudo está en [time-control-sync-phase-diagnostics.json](./time-control-sync-phase-diagnostics.json).
- El probe toma el estado del overlay durante su primera aparición. Así puede validar el bloqueo aunque el sync termine antes de que Playwright reciba `DOMContentLoaded`.

## Duración del bloqueo inicial

| Medición                          |             Spec 060 antes |             Spec 061 después |              Cambio |
| --------------------------------- | -------------------------: | ---------------------------: | ------------------: |
| Overlay visible                   |     935,6 ms (890,8–957,7) |         394,1 ms (357–428,9) | −541,5 ms (−57,9 %) |
| Overlay retirado desde navegación | 1.883 ms (1.805,1–1.953,3) | 1.298,9 ms (1.255,7–1.351,1) | −584,1 ms (−31,0 %) |

La duración del overlay cayó en las tres muestras, sin solapamiento entre rangos. La mejora coincide con eliminar del camino frío la fase `criticalStores`, cuya mediana previa fue 956,7 ms. La validación de instancia y los pasos de sincronización siguen ocurriendo antes de retirar el overlay.

## Comportamiento y fases

- `lastSyncTime` estaba ausente al inicio y se escribió al completar las tres sincronizaciones.
- Las fases fueron validación, Usuarios, Empleados, Configuraciones, Horarios y Medidores. No apareció `cache-check`.
- Cobertura del viewport y hit-test central perteneciente al overlay: 3/3. También se observaron los dos indicadores de carga, el porcentaje y el spinner.
- Se mantuvieron 20 requests API por contexto; las 60 respuestas fueron HTTP 200. La aserción de Spec 059 mantiene dos consultas `/api/records` y no reaparece la consulta de cinco filas sin empleado.
- Tras quitar la espera de IndexedDB, los `step.action` de Usuarios y Empleados quedaron con medianas de 132,3 ms y 71,2 ms; antes sus medianas eran 3 ms y 3,5 ms. El cambio adelanta esos awaits de queries activas y el total de requests no aumentó. Se conserva la espera y el refresco de esas queries.

## Métricas de pintura y límites

- FCP mediano: 708 → 744 ms (+36 ms; rangos 704–728 y 696–752 ms, solapados). Esta captura no demuestra una mejora de FCP.
- El candidato LCP registrado cambió del texto del overlay al distintivo de la app y ocurrió antes de que apareciera el overlay. No se usa esa variación para afirmar una mejora de LCP o de Core Web Vitals.
- Las cifras son tres muestras de staging bajo CPU 4×; describen este arranque y no garantizan la misma reducción en otros equipos o redes.

## Validación

- `syncSlice.test.ts`: 9/9; cubre omisión sin marca, lectura de ambas stores y rama existente cuando ambas están vacías.
- Probe Playwright staging: 1/1 test y tres contextos; overlay, secuencia de fases, requests y marcador final aprobados.
- `npm run preflight`: aprobado. El primer intento detectó solamente el formato del `plan.md`, corregido antes de repetirlo.
- Health de staging: frontend `healthy`; `GET /api/health` HTTP 200.

## Siguiente paso

Revisar la espera de validación de instancia (~369,5 ms de mediana) y el refresco de queries activas de Usuarios/Empleados. La validación protege contra una instancia de base de datos distinta y las queries cargan datos requeridos; medir su solapamiento antes de considerar cambios.
