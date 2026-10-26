# Resultado Spec 075: diferir el modal de corrección

## Cambio y comportamiento

El barrel `features/worker-portal` ahora exporta un wrapper `React.lazy` con una
frontera `Suspense` local. El tipo de props del contenedor se importa solo como
tipo. `WorkerPortal.view.tsx` quedó intacto. La prueba de componente renderiza el
modal real y comprueba su encabezado, campo y valor usando un registro sintético;
el controlador está aislado y no se envía ninguna mutación.

La regresión E2E detectó el problema en el staging previo: solicitó
`validation-Cu6zMesj.js` en la carga fría. Tras reconstruir el frontend, pasó y
capturó cero solicitudes al modal o a `validation` en la ruta inicial. El
formulario aparece cuando se monta el export diferido.

## Comparación fría en staging

Tres muestras por versión, Worker, viewport 412×823, CPU 4× y Lighthouse 12.6.1.
Se comparan los runs [baseline](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T17-23-56-778Z-9e6c151b.json)
y [resultado](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T17-57-24-073Z-ee638e54.json).

| Métrica                        | Baseline Spec 073 |    Spec 075 |               Cambio |
| ------------------------------ | ----------------: | ----------: | -------------------: |
| Score Lighthouse               |              0,68 |        0,72 |                +0,04 |
| FCP mediano                    |       4.000,83 ms | 3.665,68 ms |  −335,15 ms (−8,4 %) |
| LCP mediano                    |       5.779,99 ms | 5.054,56 ms | −725,43 ms (−12,6 %) |
| TBT mediano                    |          117,5 ms |      145 ms |             +27,5 ms |
| Transferencia total mediana    |         510.000 B |   447.279 B |  −62.721 B (−12,3 %) |
| JavaScript transferido mediano |         348.466 B |   285.779 B |  −62.687 B (−18,0 %) |

LCP y bytes superan los umbrales de esta spec. El chunk `validation` se solicitó
en las tres muestras del baseline y ya no aparece en la captura fría posterior.
El ahorro total incluye el modal y sus dependencias diferidas; no se atribuyen
los 62.687 B exclusivamente a Zod.

TBT aumentó 27,5 ms en la mediana con `n=3`; las muestras actuales fueron 145,
73,63 y 156,5 ms, por lo que se conserva como señal a observar en próximas
corridas. Esta señal no revierte la reducción de JavaScript ni la mejora de LCP.

## Corrida y límites

- Batería completa: harness 9/9, catálogo 18 rutas/8 familias, Playwright
  19/19, Lighthouse estándar 17/17, Dashboard frío 3/3 y rutas prioritarias
  frías 6/6. Gateway y API respondieron 200.
- Gates: prueba de componente 1/1, typecheck frontend, ESLint dirigido sin
  errores, `spec:check`, `docs:check`, `git diff --check` y preflight 6/6.
- Staging: frontend image
  `sha256:7853f351dfe58360746ef4b49ddaf2f27896dec333997de5aa07982ed20a9dd2`;
  backend, base de datos y volúmenes no se reconstruyeron.
- Registro: run guardado sobre el commit base `ee638e5` con `workingTreeDirty`
  verdadero; la imagen identifica el frontend exacto medido y contiene el
  wrapper de esta spec. Baseline: commit `9e6c151`, árbol limpio, imagen
  `sha256:74211fb0a76a9cd5fe7dd2f52d8c0982b37ca385108f43ac6172632f1a949cdb`.
- Un intento previo se detuvo en la validación del runner porque el shell tenía
  Node 24; el run final se ejecutó con Node 26.10.0. Se conserva el registro
  abortado para distinguirlo de las mediciones aprobadas.

El LCP frío sigue en 5,05 s. `react-core` continúa siendo el mayor recurso
JavaScript del Worker Portal (80.217 B transferidos; aproximadamente 635–699 ms
de scripting en los perfiles) y queda como siguiente foco de atribución, no como
causa confirmada de todo el LCP.
