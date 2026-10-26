# Resultado Spec 051 — 2026-10-24

## Veredicto

**Conservar la consolidación.** La garantía estructural es clara: `useAuth`
pasó de nueve suscripciones por instancia a una, y `App` pasó de dos llamadas
del hook a una. La prueba roja confirmó primero las nueve suscripciones; tras
el cambio, verifica una suscripción, reactividad de los campos de auth y que
un cambio de tema no vuelva a renderizar al consumidor.

La señal de CPU es favorable pero pequeña. En los perfiles de tres arranques,
las medianas de tiempo muestreado bajaron 7,2% en `react-core`, 4,6% en el
archivo de ReactDOM y 11,5% en el chunk de estado. Estas cifras atribuyen
muestras a archivos/chunks; no miden el costo exclusivo del hook. Lighthouse
no mostró un cambio material en FCP o LCP. El TBT mediano combinado bajó 7,5%,
pero se informa como señal sin gate rígido.

## Entorno y artefactos

- Staging local: `http://127.0.0.1:8080`; gateway y API respondieron HTTP 200.
- Imagen frontend: `sha256:7167594181d29441beef688f076b156586ed69a24d97300a92913549d7e96962`.
- Runner: Node 26.10.0, Chrome 153, Lighthouse 12.6.1, CPU 4× para perfiles.
- Fuente: commit base `20a30b8`; las mediciones incluyen los cambios de Spec 051 antes del commit (`workingTreeDirty: true`).
- Resumen numérico de perfiles: [`cpu-profile-summary.json`](./cpu-profile-summary.json).
- Corridas completas conservadas en el ledger de Spec 039:
  - [Primera corrida, con un outlier Lighthouse de Worker Portal](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T04-20-19-776Z-20a30b8c.json).
  - [Repetición completa aprobada](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T04-37-20-455Z-20a30b8c.json).

## Perfiles CPU de Dashboard

Cada columna conserva las tres muestras en orden de captura. Los tiempos son
muestreo atribuido a la fuente/chunk en perfiles CDP, no tiempo exclusivo ni
latencia visible.

| Fuente o señal                              | Antes (ms)               | Mediana antes | Después (ms)             | Mediana después | Cambio de mediana |
| ------------------------------------------- | ------------------------ | ------------: | ------------------------ | --------------: | ----------------: |
| `react-core`                                | 392,58 / 297,87 / 303,29 |        303,29 | 288,44 / 281,51 / 272,20 |          281,51 |             −7,2% |
| ReactDOM (`react-dom-client.production.js`) | 372,65 / 267,74 / 265,11 |        267,74 | 266,85 / 255,08 / 255,54 |          255,54 |             −4,6% |
| Chunk `state`                               | 137,78 / 113,74 / 90,88  |        113,74 | 100,66 / 87,75 / 151,78  |          100,66 |            −11,5% |
| Blocking estimado por Long Task API         | 296 / 251 / 200          |           251 | 445 / 191 / 110          |             191 |     Señal ruidosa |

El perfil posterior de `useAuth` no acumuló suficiente muestreo directo para
tratar sus milisegundos como una medida estable. El valor de 32,8 ms observado
antes era trabajo acumulado en el contexto de `renderWithHooks`, no tiempo
exclusivo de `useAuth`. La primera muestra Long Task posterior fue un outlier;
esta API tampoco equivale a Lighthouse TBT.

## Lighthouse frío: comparación de seis muestras

La línea base son las seis muestras finales documentadas en Spec 050, con el
shell de Dashboard ya aplicado. La comparación posterior combina las tres
muestras frías de cada corrida de Spec 051. Comparten Chrome, viewport, staging
y metodología.

| Métrica                | Antes (Spec 050, n=6) | Después (n=6) |                  Cambio |
| ---------------------- | --------------------: | ------------: | ----------------------: |
| Lighthouse Performance |                 0,915 |          0,92 |           +0,005 puntos |
| FCP                    |           2.468,73 ms |   2.461,85 ms |                  −0,28% |
| LCP                    |           2.555,63 ms |   2.554,87 ms |                  −0,03% |
| TBT                    |             171,00 ms |     158,25 ms |                   −7,5% |
| CLS mediano            |               0,00019 |             0 | Menor en estas muestras |

FCP y LCP se mantienen prácticamente iguales. En la medición fría posterior
se registraron 81 solicitudes, 448.320 bytes transferidos en mediana y
283.343 bytes de scripts; el cambio de `useAuth` no redujo el volumen de JS.
La diferencia de TBT es modesta y variable, así que no se adjudica causalidad
solo a esta optimización.

## Batería multirruta y variación observada

La primera corrida completó Playwright y los tres casos fríos de Dashboard,
pero falló 3 de 85 aserciones Lighthouse en Worker Portal: score 0,25, FCP
6.831 ms, LCP 11.013 ms y TBT 17.159 ms. La ruta final y el contenido eran
correctos. Un Lighthouse aislado posterior en la misma imagen dio score 0,99,
FCP 249 ms, LCP 784 ms y TBT 129 ms. Se conserva la corrida fallida para
mostrar esta variación, no se presenta como regresión del cambio.

La segunda batería completa pasó: 10/10 pruebas Playwright, catálogo de 18
rutas en 8 familias, 17 rutas Lighthouse y 85/85 aserciones. Worker Portal
marcó score 0,96, FCP 298 ms, LCP 914 ms, TBT 214 ms y CLS 0. Las tres muestras
frías de Dashboard también pasaron.

## Validación ejecutada

- `npm run test:jsdom -- src/tests/hooks/useAuthSubscriptions.test.tsx src/tests/state/forcePasswordChangeSession.test.tsx`: 2/2 pruebas pasaron.
- `npm run test:run:ci -- --related src/hooks/useAuth.ts`: 51 archivos, 218 pruebas pasaron.
- `npm run check` y `npm run lint` del frontend: pasaron.
- `npm run build` durante la reconstrucción de la imagen de staging: pasó.
- `npm run spec:check`: pasó con 51 specs.
- `npm run preflight`: pasaron los gates de secretos, specs, docs, formato, lint budget y typecheck de backend/frontend.
- La ejecución completa `npm run validate:ci` terminó con código 143 antes de producir un resultado de suite; por eso no se reporta como aprobada. Las pruebas relacionadas sí finalizaron y pasaron.

## Siguiente oportunidad

El volumen inicial de JavaScript sigue igual y `react-core` concentra el mayor
tiempo muestreado de hilo principal. La siguiente iteración debe identificar
qué renders o commits de React generan ese trabajo, y validar cualquier
optimización con el mismo perfil frío y la batería multirruta antes de
atribuirle una mejora.
