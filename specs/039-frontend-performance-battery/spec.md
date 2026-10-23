# Spec 039: Frontend Performance Battery

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-23
- ADR relacionado: N/A

## Problema

La spec 037 añadió Lighthouse CI, un presupuesto de bundle y mediciones Playwright, pero faltaba una orden repetible que entregara datos comparables para decidir qué optimizar. El test anterior de scroll promediaba cinco operaciones medidas entre llamadas separadas al navegador y fallaba solo sobre 500 ms; su resultado de **89,36 ms** no era tiempo de frame. La nueva batería repite rutas y transiciones, mide frames dentro del navegador y adjunta resultados JSON.

El primer baseline de la batería en staging (`127.0.0.1:8080`) encontró un valor atípico de **TBT 2.670 ms** en Dashboard. La revisión posterior detectó que Worker Portal también había sido medido como Dashboard por autenticarse con el rol equivocado; ese reporte no es una vista adicional. Lighthouse atribuyó **1.697 ms de scripting** al chunk `react-core` y registró una tarea larga de **1.376 ms** como no atribuible; se necesita un trace antes de asignar esa demora a un componente. Las corridas posteriores demostraron que el TBT no era reproducible y que la sesión/cache persistida ocultaba el costo de carga fría: tres corridas con storage limpio dieron medianas de **FCP 5.234 ms** y **LCP 7.954 ms**. Por eso `perf:staging` conserva la pasada existente y añade tres muestras frías de Dashboard. El scroll de Governance tuvo **p95 33,4 ms**, con cero frames sobre 50 ms; queda como control.

Los Lighthouse del baseline son una pasada por ruta y sirven para ordenar la investigación, no para declarar una mejora causal. La evidencia anterior de Lighthouse y Playwright viene de un stack local aislado distinto (`127.0.0.1:18081`) y no se compara numéricamente con este build.

## Alcance

Dentro:

- Crear un comando de una sola ejecución contra el staging local de producción (`127.0.0.1:8080`) que valide salud, ejecute Playwright `perf` con un worker y Lighthouse CI autenticado. El catálogo conserva todas las rutas en Playwright; Lighthouse cubre las que entregan métricas válidas.
- Reemplazar la métrica de scroll basada en cinco round-trips Playwright por una medición en el navegador de intervalos entre frames mientras se recorre la lista virtualizada de auditoría; informar filas, rango desplazable, cantidad de muestras, p50, p95, máximo y frames sobre 50 ms.
- Repetir las mediciones de preparación de rutas y cambio de pestañas, e incluir resultados JSON adjuntos al reporte Playwright.
- Mantener un catálogo único de rutas con familia funcional, perfil de acceso, selector de preparación e interacciones seguras; Lighthouse y Playwright consumen las mismas rutas.
- Medir patrones compartidos de búsqueda, pestañas diferidas y apertura/cierre de paneles en rutas representativas, con tres repeticiones y sin enviar formularios.
- Guardar cada ejecución completa como JSON versionado bajo `evidencia/runs/`, con identificación del build de staging, entorno, catálogo y estado de cada fase.
- Medir Dashboard tres veces con storage del navegador limpio para distinguir la carga fría del resultado con estado persistido.
- Establecer una línea base del build actual y documentar los siguientes focos: (1) FCP/LCP fríos de Dashboard; (2) las otras vistas con TBT más alto y Kiosk, cuya ruta tiene la mediana más alta; (3) scroll virtualizado de Governance como control, con p95 33,4 ms y cero frames sobre 50 ms; (4) mantener bundle/precache bajo sus presupuestos existentes y volver a medirlos al intervenir chunks.
- Mantener los presupuestos de bundle y las métricas Lighthouse ya existentes como capas complementarias de la batería.

Fuera (explícito):

- Optimizar código de producto; la primera iteración mide y establece una línea base. Cada optimización posterior se hará con evidencia de esta batería.
- Pruebas de carga de API con Artillery, cambios backend, pruebas de INP sintéticas y publicación o despliegue remoto.
- Cambiar los umbrales globales de Lighthouse, los budgets existentes o la frecuencia de CI.

## Criterios de aceptación

- [x] AC1: `npm run perf:staging` requiere Node 26, valida que el gateway y `/api/health` respondan 200; luego corre solo el proyecto Playwright `perf` con `--no-deps` y un worker, Lighthouse CI por las diecisiete rutas elegibles y tres muestras frías adicionales de Dashboard.
- [x] AC2: La medición de scroll realiza al menos 60 muestras de intervalos entre `requestAnimationFrame` dentro del navegador, verifica que la lista realmente tenga overflow, y reporta p50, p95, máximo, eventos de scroll y cantidad de filas renderizadas. El reporte avisa si p95 supera 50 ms y conserva un límite de fallo inicial de 250 ms para detectar pausas severas.
- [x] AC3: Las dieciocho rutas del catálogo tienen tres mediciones en contextos de navegador nuevos y reportan cada muestra, mediana, máximo, rol y familia; Governance mide cinco transiciones y distingue la primera del comportamiento repetido.
- [x] AC4: Cada prueba Playwright adjunta un JSON con timestamp, URL base, viewport, métrica y muestras; ambos perfiles Lighthouse conservan sus reportes bajo `frontend/.lighthouseci/`.
- [x] AC5: La batería no crea, modifica ni elimina datos de negocio; usa navegación, autenticación seed, búsqueda local, cambio de pestaña, apertura/cierre del panel de lecturas y scroll, sin enviar formularios. Si el staging no tiene filas auditables/desplazables, falla con diagnóstico en vez de marcar la medición como exitosa sin datos.
- [x] AC6: Se guarda evidencia del build actual con commit, estado de salud, salida de cada batería y sus límites; la evidencia distingue la métrica histórica de round-trip de la nueva métrica de frame.
- [x] AC7: El perfil frío usa tres corridas seriales con `disableStorageReset: false`, no cambia los umbrales globales de Lighthouse y permite comparar FCP, LCP, TBT, solicitudes y bytes con el mismo método.
- [x] AC8: Lighthouse selecciona una sesión autorizada para Worker Portal y detiene la medición si una ruta protegida aterriza en otra página.
- [x] AC9: `frontend/performance-routes.json` es el catálogo único de 18 rutas; cada una declara familia, URL esperada, perfil de acceso, criterio de preparación y si admite Lighthouse. Un check verifica ids/rutas únicas, razones para las exclusiones y coherencia de ambas configuraciones Lighthouse.
- [x] AC10: Cada ejecución escribe un archivo nuevo en `evidencia/runs/<runId>.json` con `schemaVersion`, commit y estado del checkout, id de imagen de staging, entorno, rutas/familias, fases, métricas y error si una fase falla. El formato está documentado en `evidencia/runs/README.md`.
- [x] AC11: Las pruebas representativas repiten tres veces búsquedas locales, pestañas diferidas y el ciclo abrir/cerrar del formulario, y guardan muestras, mediana, p95 y máximo por interacción.
- [x] AC12: Login permanece en Playwright, pero se excluye de Lighthouse tras reproducir `NO_FCP` con las variantes móvil y desktop mientras Chromium muestra el contenido. La limitación queda documentada en el catálogo y en evidencia; las otras 17 rutas sí generan métricas Lighthouse.
- [x] AC13: El adaptador Lighthouse usa el contrato Puppeteer `waitForFunction(función, opciones, argumentos)`, exige un shell presente para rutas protegidas y adjunta ruta/rol observados al fallar sin exponer tokens.

## Restricciones

- El escenario de medición se ejecuta contra el compose staging local y no contra producción; no altera bases de datos ni volúmenes.
- Playwright corre sin suites funcionales/visuales concurrentes, en Chromium y con viewport fijo, para reducir contaminación por CPU.
- El umbral de 50 ms es una señal de atención, no un gate estricto mientras se calibra la nueva métrica. El p95 solo se compara entre corridas con el mismo host, navegador y configuración.
- No se añade dependencia ni se cambia un contrato HTTP.

## Trazabilidad

- Tests que lo probarán: `frontend/e2e/performance.spec.ts`, `frontend/scripts/run-performance-battery.cjs`, `frontend/scripts/check-performance-routes.cjs`, Lighthouse CI y `frontend/scripts/check-bundle-budget.cjs`.
- Docs/evidencia: `./plan.md`, `./tasks.md`, `./evidencia/diagnostico-previo-2026-10-23.md`, `./evidencia/baseline-2026-10-23.md`, `./evidencia/seguimiento-dashboard-2026-10-23.md`, `./evidencia/expansion-rutas-2026-10-23.md` y los registros de `./evidencia/runs/`.
