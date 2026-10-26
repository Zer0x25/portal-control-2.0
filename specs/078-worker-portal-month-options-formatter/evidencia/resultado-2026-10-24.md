# Resultado Spec 078: reutilizar el formateador de meses

## Cambio y equivalencia funcional

`useWorkerPortalData` ahora crea un único `Intl.DateTimeFormat("es-CL", ...)`
dentro del `useMemo` que construye las opciones y lo reutiliza para las 12
fechas. Se mantiene local al callback para que su costo quede dentro del mismo
tramo medido y no se desplace a la evaluación inicial del módulo.

El test del hook compara las opciones con el formato anterior en el runtime
actual, verifica orden newest-first y cruza de 2026-03 a 2025-04. Pasó 10/10.
La verificación Playwright contra el staging reconstruido confirmó el portal
Worker y las 12 opciones del selector. No se enviaron mutaciones.

## CPU muestreado

La base Spec 077 usó Chromium 153, CPU 4× y el mismo muestreador de 1 ms. El
frame propio `useWorkerPortalData.ts:154 useMemo` apareció en 3/3 contextos, con
11,038–15,907 ms y mediana de 15,708 ms.

Se repitió el perfil completo tres veces sobre el mismo build candidato. Cada
reporte contiene tres contextos fríos autenticados, con bundles locales
coincidentes byte por byte con 207/207 scripts de staging.

|       Corrida | Tiempos propios detectados en `useMemo@154` | Contextos con frame | Mediana de CPU activo | `react-core` propio mediano |
| ------------: | ------------------------------------------: | ------------------: | --------------------: | --------------------------: |
| Base Spec 077 |                 11,038 / 15,907 / 15,708 ms |                 3/3 |            651,933 ms |                  176,955 ms |
|   Candidata 1 |                                    4,620 ms |                 1/3 |            609,740 ms |                  176,928 ms |
|   Candidata 2 |                                    3,876 ms |                 1/3 |            660,074 ms |                  182,709 ms |
|   Candidata 3 |                                    6,624 ms |                 1/3 |            637,295 ms |                  171,557 ms |

Entre los frames detectados, la mediana candidata fue 4,620 ms, 70,6% menor que
la base; cada corrida tuvo al menos una detección y todas quedaron bajo el
umbral de 12,566 ms. En 6/9 contextos candidatos el muestreador de 1 ms no
atribuyó muestras a ese frame. El resumen del perfil cuenta esos contextos como
cero tiempo muestreado; no significa que el trabajo de CPU sea exactamente cero.
La aparición bajó de 3/3 a 1/3 por corrida, coherente con un tramo más corto que
el intervalo de muestreo. El cambio cumple el umbral local de la spec, con esa
limitación explícita.

La mediana de CPU activo por corrida fue 637,295 ms, 2,2% menor que la base, pero
la dispersión de corridas (609,740–660,074 ms) y el `react-core` propio sin
cambio medible (176,928 ms frente a 176,955 ms) no permiten atribuir una mejora
de página. No se ejecutó Lighthouse posterior y no se afirma mejora de LCP o
TBT.

## Staging y validaciones

- Los registros anotan commit `6936a2f` y `workingTreeDirty=true` por el cambio candidato; la identidad medida queda fijada por la imagen y la paridad 207/207.
- Imagen frontend candidata: `sha256:8cf223b927a58f697ceda99de0a00a04e70888f35ff8b1384fa156677a57b54b`.
- Gateway/API readiness HTTP 200; reloj 9/9; API sin respuestas fallidas 9/9; WebSocket sin errores 9/9.
- Backend, DB, PgBouncer y gateway conservaron sus IDs de contenedor e imagen; el volumen PostgreSQL fue `portal-control-staging_postgres_data_staging` antes y después.
- El frontend quedó healthy; `frontend/dist/index.html` mide 5.076 B y no contiene source maps.
- El script de perfil restauró el build normal local tras cada corrida.
- Registros: [corrida candidata 1](./month-options-candidate-run-1-2026-10-24.json), [corrida candidata 2](./month-options-candidate-run-2-2026-10-24.json) y [corrida candidata 3](./month-options-candidate-run-3-2026-10-24.json). La línea base es [el perfil Spec 077](../../077-worker-portal-production-cpu-attribution/evidencia/worker-portal-production-cpu-2026-10-24.json).
- Validación funcional: `npx vitest run src/tests/features/worker-portal/useWorkerPortalData.test.tsx` 10/10 y Playwright `a11y.spec.ts` worker light 1/1; frontend typecheck y lint pasan.
