# Resultado: Defer Role-specific Auto-start Code

## Resultado

La separación de auto-inicio redujo los scripts descargados al arrancar Dashboard para un Administrador sin empleado elegible. También mejoraron las medianas de Lighthouse en las tres muestras frías. La descarga de chunks es evidencia directa del cambio; las métricas Lighthouse siguen sujetas a variación del entorno.

| Métrica en Dashboard frío |    Baseline |     Después |              Cambio |
| ------------------------- | ----------: | ----------: | ------------------: |
| Lighthouse Performance    |        0,69 |        0,72 |               +0,03 |
| FCP                       | 3.709,64 ms | 3.642,41 ms |  −67,23 ms (−1,8 %) |
| LCP                       | 5.329,67 ms | 5.179,54 ms | −150,13 ms (−2,8 %) |
| TBT                       |      174 ms |    137,5 ms |  −36,5 ms (−21,0 %) |
| Transferencia total       |   459.522 B |   447.388 B |  −12.134 B (−2,6 %) |
| Scripts Lighthouse        |   295.739 B |   283.552 B |  −12.187 B (−4,1 %) |
| Solicitudes Lighthouse    |          86 |          81 |         −5 (−5,8 %) |

La captura Playwright de recursos JavaScript pasó de 74 a 69 solicitudes (−6,8 %), de 161.774 a 150.418 bytes transferidos (−7,0 %) y de 142.274 a 132.418 bytes codificados (−6,9 %). El Dashboard ya no descarga los chunks exclusivos de planificación y auto-inicio. `leaveService` sigue presente porque la consulta de registros de tiempo también lo usa.

El arranque del Dashboard hizo 8 solicitudes API, todas a endpoints únicos, con respuestas HTTP 200 y sin consultas de planificación para auto-inicio. Las 18 rutas funcionales completaron sus muestras; las 17 rutas Lighthouse aprobaron 85/85 aserciones. Pasaron las 7 pruebas Playwright de rendimiento, incluidos los guards de chunks, consultas iniciales, notas bajo demanda, scroll virtualizado, transiciones y readiness.

## Trazabilidad de las corridas

- Baseline limpio, anterior a Spec 049: [ledger `b49d6915`](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T01-42-28-474Z-b49d6915.json).
- Corrida posterior oficial, checkout limpio: [ledger `adffe1ef`](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T02-28-24-357Z-adffe1ef.json), con `workingTreeDirty=false`.
- Comparación de chunks: [baseline](baseline/dashboard-eager-chunks.json) y [post cambio](full-battery/dashboard-eager-chunks.json).
- API al iniciar Dashboard: [captura Playwright](full-battery/dashboard-startup-api-requests.json).
- Detalle Lighthouse del hilo principal y LCP: [diagnóstico por muestra](full-battery/dashboard-lighthouse-diagnostics.json).
- Imagen staging: `sha256:a72d929628b12350eae8e943f276112bf1db25c19177b0efb6be3d2352a6b2b2` (gateway y API HTTP 200).
- Commit de implementación: `546d870324cb1c8aae8417cb7b0a0d5ea896c077`. El commit de origen que guarda el ledger limpio es `adffe1ef36d9500cd89a1a983a3f3742063000e6`; entre ambos solo se registró evidencia, y la imagen frontend coincide.

La primera corrida posterior de las 02:16 quedó guardada en el ledger con `workingTreeDirty=true` porque las capturas preliminares aún no estaban registradas. Se repitió tras registrar esas capturas; la corrida limpia de las 02:28 es la base oficial de esta comparación.

## Validación

- `frontend npm run validate:ci`: 179 archivos de test, 933 tests y gates de lint, TypeScript, build y presupuesto aprobados.
- `npm run preflight`: secretos, specs, documentación, formato, ratchets y TypeScript aprobados.
- Staging: E2E dirigido y batería completa aprobados.

## Siguiente gap medido

Los chunks exclusivos de auto-inicio ya no forman parte del arranque Admin. En las muestras frías, Lighthouse atribuyó 697–829 ms de evaluación de JavaScript al chunk `react-core` (218.860 B sin comprimir, 80.217 B transferidos) y estimó 31.958–32.280 B no usados. El chunk contiene únicamente React, React DOM y Scheduler, así que esa estimación no identifica por sí sola código seguro para quitar. Lighthouse eligió el texto del reloj como LCP, con 1.562–1.570 ms de demora de render. El siguiente paso es perfilar el arranque de ese contenido y clasificar el trabajo de React antes de cambiar dependencias o el comportamiento del reloj.
