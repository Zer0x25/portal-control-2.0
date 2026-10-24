# Resultado Spec 060: tiempos de fases de sincronización

## Captura

- Fecha: 2026-10-24, captura `2026-10-24T10:53:25.367Z`.
- Entorno: frontend staging reconstruido, ruta `/#/time-control`, tres contextos autenticados nuevos, Chromium, 412×823, CPU 4×.
- El probe activa el flag diagnóstico antes del bundle. Cada evento registra solo fase, nombre, duración y resultado; los requests siguen sin query values ni bodies. La evidencia cruda está en [time-control-sync-phase-diagnostics.json](./time-control-sync-phase-diagnostics.json).

## Duración por fase

| Fase                                                  |  Mediana |          Rango | Resultado |
| ----------------------------------------------------- | -------: | -------------: | --------- |
| `validateInstanceId`                                  | 392,9 ms |   379,3–406 ms | 3/3 éxito |
| `criticalStores` (dos lecturas `count()` en paralelo) | 956,7 ms | 898,4–996,5 ms | 3/3 éxito |
| Acción `Usuarios`                                     |     3 ms |       2,2–3 ms | 3/3 éxito |
| Acción `Empleados`                                    |   3,5 ms |     3,3–4,3 ms | 3/3 éxito |
| Acción `Configuraciones`                              |   3,6 ms |     3,4–4,3 ms | 3/3 éxito |
| Acción `Horarios`                                     |   3,7 ms |     3,6–3,8 ms | 3/3 éxito |
| Acción `Medidores`                                    |   3,2 ms |     2,4–4,1 ms | 3/3 éxito |

El chequeo de stores críticas domina las fases instrumentadas: su mediana es más de dos veces la de la validación de instancia y muy superior a cualquiera de las cinco acciones. El overlay duró 890,8–957,7 ms (mediana 935,6 ms), prácticamente lo mismo que el chequeo de 898,4–996,5 ms. Las acciones sumaron menos de 20 ms por muestra. En este flujo frío, el chequeo es el candidato de mayor ganancia.

`idbIsStoreEmpty` ya usa `objectStore.count()` y no materializa las colecciones. El tiempo medido incluye la espera por la apertura inicial de IndexedDB y ambas transacciones; no prueba que `count()` sea lento por sí solo. Al iniciar sin `lastSyncTime`, el resultado de ese chequeo tampoco puede cambiar la rama `if (isCacheEmpty && since)`. La siguiente spec evaluará omitir esa espera redundante en ese caso y comparar el overlay.

## Métricas y comportamiento

- Overlay: cobertura completa y hit-test central en las 3 muestras; `lastSyncTime` ausente al inicio y escrito al final.
- FCP mediana: 708 ms. Candidato LCP observado mediano: 1.664 ms. Son mediciones de instrumentación, no una comparación de mejora visual.
- Requests: 20 por muestra, todos HTTP 200. Se mantienen dos `/api/records` por contexto (`pageSize=50` de filtros y `pageSize=30` de tabla); no volvió la consulta sin empleado de Spec 059.
- El orden capturado fue validación, chequeo de stores y luego Usuarios, Empleados, Configuraciones, Horarios y Medidores. No se cambió la lógica ni el orden de sincronización.

## Validación

- Unit tests `syncSlice.test.ts`: 6/6; cubren flag apagado, secuencia optativa y registro de error del chequeo.
- Probe Playwright en staging: 1/1 test, tres contextos.
- Typecheck, lint, Prettier, `spec:check`, `docs:check` y preflight: aprobados.

## Decisión

Priorizar el chequeo condicional de stores cuando `lastSyncTime` es nulo. Mantener la verificación cuando existe una marca anterior, porque esa es la rama donde una caché vacía afecta la decisión de sincronización.
