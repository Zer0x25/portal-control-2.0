# Resultado Spec 081: renders derivados del Worker Portal

## Método

Se midieron tres contextos fríos antes y después, con la misma configuración:
Node 26.10.0, Vite 8.3.3, Chromium 153, viewport 412×823 y CPU 4×. El frontend
de desarrollo usó el proxy `/api` hacia `127.0.0.1:8080`. El runner inició
sesión y navegó directamente al Worker Portal; no ejecutó mutaciones de negocio.

El baseline se tomó restaurando temporalmente el hook de `HEAD`; luego se
restauró la implementación optimizada y se repitieron las tres muestras. Una
corrida previa con API directa se descartó por fallos CORS y Node 24; no forma
parte de estos resultados.

## Resultados

| Scope                      | Baseline: commits / `actualDuration` mediana | Cambio: commits / `actualDuration` mediana | Resultado                                                |
| -------------------------- | -------------------------------------------: | -----------------------------------------: | -------------------------------------------------------- |
| Ruta `worker-portal`       |                                 5 / 142,2 ms |                               4 / 105,3 ms | Un commit menos en cada muestra.                         |
| Vista `worker-portal:view` |                                  4 / 96,2 ms |                                4 / 80,2 ms | Conteo igual; mediana de duración menor en esta corrida. |

Cada muestra posterior registró cuatro commits de ruta y cuatro de vista; el
baseline registró cinco de ruta y cuatro de vista. El evento de ruta no
emparejado (0–0,7 ms) del baseline desapareció en las tres muestras. Eventos
descartados: 0/3 en ambos grupos.

La reducción más sólida es un commit de ruta menos por navegación. Los tiempos
de `actualDuration` son de React Profiler en Vite dev; su descenso es una señal
de esta corrida, no una estimación de producción ni de Core Web Vitals.

## Estado y límites

- `WorkerPortal.view.tsx` no se modificó.
- La imagen frontend de staging permaneció en
  `sha256:8cf223b927a58f697ceda99de0a00a04e70888f35ff8b1384fa156677a57b54b`;
  no se reconstruyó ni reinició ningún servicio.
- Health de staging respondió HTTP 200 después de la medición.
- La sincronización inicial de la app terminó correctamente. Persistieron
  errores `EPIPE`/WebSocket del proxy Vite en el canal de tiempo real, como en
  Spec 080; el runner no depende de ese canal para su medición.
- Capturas crudas: [baseline](./worker-portal-baseline-render-profile-2026-10-24.json)
  y [versión optimizada](./worker-portal-render-profile-2026-10-24.json).
