# Resultado Spec 106: Evitar sincronizaciones redundantes del filtro rápido

Fecha: 2026-10-26. Ruta `/#/time-control`. Se reutilizó el backend local de
staging, sin ejecutar operaciones de negocio.

## Cambio y regresión

`useTimeRecordFilters` compara `is24h`, `desde` y `hasta` antes de guardar el
rango sincronizado. Si ya están iguales, el efecto no repite las escrituras de
estado. El manejador tampoco vuelve a guardar un filtro que ya está activo y
aplicado.

La prueba fallaba antes de cada guard: el montaje repetía un render, elegir otro
filtro generaba un render de seguimiento y volver a pulsar el filtro activo
generaba un render. Tras el cambio, el montaje y la selección de un rango
distinto hacen un render cada uno; repetir la selección activa hace cero. Otras
pruebas confirman que un cambio de fecha de negocio vuelve a sincronizar el
rango y que las fechas personalizadas siguen pendientes hasta pulsar Aplicar.

## Perfil React antes/después

Tres capturas por lado con `measure-renders.mjs`, Chromium, Vite en desarrollo,
viewport móvil 412×823 y CPU 4×. Cada captura usó un contexto nuevo, mismo rol
administrador y API de staging por el proxy local. Los tiempos React sirven
para atribución; no equivalen a métricas de producción.

| Scope                  | Commits base | Commits candidato | Duración base por muestra | Duración candidata por muestra |
| ---------------------- | ------------ | ----------------- | ------------------------- | ------------------------------ |
| `time-control:filters` | 3, 3, 3      | 2, 2, 2           | 43,8; 35,3; 39,7 ms       | 95,5; 52,5; 33,5 ms            |
| Ruta `time-control`    | 6, 6, 6      | 5, 5, 6           | 124,3; 137,8; 148,5 ms    | 292,4; 188,5; 109,3 ms         |

El scope de filtros tuvo un commit React menos en las tres capturas, y su
duración mediana no bajó: 39,7 ms base frente a 52,5 ms candidato. La mediana
de duración de ruta fue 137,8 ms base y 188,5 ms candidato; el rango candidato
se amplió mucho y se solapa con la base. Por eso solo se declara la reducción
determinista de commits del scope; no se atribuye reducción de CPU, TBT, INP,
Lighthouse ni latencia de usuario. El perfil de desarrollo también registró
errores EPIPE del proxy de WebSocket en ambos grupos, otra razón para no
interpretar esas duraciones como impacto de usuario.

## Verificación de staging

El frontend candidato quedó en la imagen
`sha256:c7f1e1e96724046e2034089e4b0778d9dd4eea27d377e1024fbb17c1f777c652`.
La imagen terminó `healthy`; `GET /api/health/ready` respondió
`{"status":"ready","healthStatus":"healthy"}` y el frontend respondió
HTTP 200. Playwright autenticó la ruta y seleccionó dos veces cada filtro
`7d`, `31d` y `24h`: todos siguieron activos, con cero errores de página y
cero respuestas API >=400. No se cambió el backend ni se escribieron datos de
negocio.

Los cinco tests del hook pasan. TypeScript, lint focalizado, build de
producción, `spec:check`, `docs:check`, ratchet ESLint 0/0 y el preflight
completo pasan. No se modificó `TimeControl.view.tsx`.
