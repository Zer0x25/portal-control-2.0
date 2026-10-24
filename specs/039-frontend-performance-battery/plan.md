# Plan 039: Frontend Performance Battery

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. **Dashboard — CSS crítico:** la comparación fría entre los registros `2026-10-24T05-47-44-993Z-90a9f766` y `2026-10-24T07-19-00-817Z-465361c6` redujo las medianas de FCP/LCP de 2.462/2.558 ms a 2.027/2.254 ms. Ambas pasan la puerta de 250 ms; TBT mediano subió 57 ms (una muestra llegó a 413 ms), y se conserva como señal sin convertirlo en gate por su variación histórica. El guard protege otras rutas hasta que la hoja completa esté lista.
2. **Siguiente foco — Control horario:** sus tres corridas frías dieron medianas FCP/LCP/TBT de 4.353/6.473/232 ms y score 0,62; tiene el LCP frío mayor del conjunto. Worker Portal quedó en 3.939/5.646/163 ms y score 0,68. En Lighthouse estándar, Dashboard tuvo TBT de 306 ms, Gestión de personal 295 ms, Worker Portal 253 ms y Control horario 225,5 ms. Perfilar Control horario por su costo de render frío y revisar Gestión de personal en la siguiente investigación de TBT.
3. **Control de interacción:** conservar la medición de scroll virtualizado con timestamps de `requestAnimationFrame` dentro del navegador y cinco cambios de pestaña en Governance. Su baseline fue p95 33,4 ms y cero frames sobre 50 ms, así que no es el primer candidato de optimización.
4. **Cobertura por rutas y patrones:** mantener `frontend/performance-routes.json` como contrato común de Playwright y Lighthouse. Las 18 vistas se agrupan en ocho familias: acceso, dashboard, datos operativos, planificación, administración, experiencia del trabajador, comunicaciones y gestión de directorios. Playwright recorre las 18; Lighthouse mide las 17 rutas con FCP disponible. Login permanece en Playwright porque Lighthouse reproduce `NO_FCP` en presets móvil y desktop aunque Chromium muestra su contenido. Los probes se asocian a rutas representativas para volver a medir las mismas interacciones cuando se optimicen componentes compartidos.
5. **Runner repetible:** `frontend/scripts/run-performance-battery.cjs` requiere Node 26, valida salud y destino local, ejecuta el proyecto Playwright `perf` con un worker, Lighthouse CI por las 17 rutas Lighthouse elegibles (con sesión por rol y guardia de destino), tres muestras frías de Dashboard y tres muestras frías por ruta para Worker Portal y Control horario. Un error detiene las fases siguientes y queda escrito en el registro de esa ejecución.
6. **Registro comparable:** cada corrida agrega un JSON bajo `evidencia/runs/` con commit, estado del checkout, contenedor de staging, versiones de Node/navegador, mapa de rutas/familias, estado de cada fase y resultados. Los archivos no se sobrescriben; cambios incompatibles incrementan `schemaVersion`.
7. **Capas complementarias:** mantener Lighthouse para carga (LCP/FCP/CLS/score/response/TBT), Playwright para preparación de ruta e interacciones, y el verificador de bundle para tamaño/chunks/precache. No mezclar la prueba Artillery del backend con la batería de UX frontend.
8. **Ciclos siguientes:** reconstruir staging después de cada mejora y repetir exactamente `npm run perf:staging`. Comparar el mismo host, Chromium, perfiles frío/caliente y pares de ruta/familia. No cambiar presupuestos hasta tener corridas repetidas comparables y un trace que identifique el costo principal.

## Archivos a tocar

| Archivo                                                   | Cambio                                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `frontend/e2e/performance.spec.ts`                        | Añadir resúmenes estadísticos, medición de frames en navegador, repeticiones y adjuntos JSON. |
| `frontend/scripts/run-performance-battery.cjs`            | Verificar health y orquestar Playwright + LHCI usando `spawnSync` con argumentos.             |
| `frontend/performance-routes.json`                        | Catálogo único de rutas, perfiles, familias y probes de interacción.                          |
| `frontend/scripts/check-performance-routes.cjs`           | Comprobar coherencia entre catálogo y configuración Lighthouse.                               |
| `specs/039-frontend-performance-battery/evidencia/runs/*` | Historial versionado, un JSON por corrida.                                                    |
| `frontend/.lighthouserc-dashboard-cold.json`              | Repetir Dashboard tres veces con storage limpio y guardar reportes en `.lighthouseci/`.       |
| `frontend/.lighthouserc-priority-cold.json`               | Repetir Worker Portal y Control horario tres veces cada uno con storage limpio.               |
| `frontend/scripts/run-performance-battery.test.cjs`       | Validar tres reportes correctos por ruta fría, sin redirecciones ni omisiones.                |
| `frontend/package.json`                                   | Añadir el comando `perf:staging`.                                                             |
| `specs/039-frontend-performance-battery/spec.md`          | Requisitos, prioridad basada en datos y criterios medibles.                                   |
| `specs/039-frontend-performance-battery/tasks.md`         | Tareas trazables al AC.                                                                       |
| `specs/039-frontend-performance-battery/evidencia/*`      | Guardar diagnóstico, baseline y comparación del primer ciclo de optimización.                 |

## Contratos afectados

Ninguno. No cambia HTTP, OpenAPI, SDK, Prisma, base de datos ni runtime de producción.

## Riesgos y rollback

- **Variación del host:** serializar el proyecto `perf`, usar Chromium y viewport fijo, registrar URL/timestamp y muestras crudas. No comparar p95 de hosts distintos como si fueran equivalentes.
- **Datos de auditoría insuficientes:** exigir overflow real y filas visibles; fallar con geometría y conteos para señalar que el staging no contiene datos que permitan medir virtualización.
- **Latencia del runner de pruebas:** medir los frames dentro del navegador; el tiempo de navegación/cambio de pestaña se conserva como tiempo observado de extremo a extremo y se etiqueta distinto.
- **Costo y variación de Lighthouse:** mantener una pasada por las diecisiete rutas elegibles y ejecutar tres pasadas frías para Dashboard, Worker Portal y Control horario; ambas fuera de CI cotidiano. Login conserva su medición Playwright y la explicación de `NO_FCP`. Los valores ordenan focos, no prueban mejora causal. El runner no cambia workflows.
- **Rollback:** revertir el test, el runner, el script de paquete y esta spec/evidencia; no hay datos de negocio que restaurar.

## Verificación

```bash
# Staging local levantado y saludable
npm run perf:staging

# Revisión local del código de test
npm --prefix frontend run check
npm --prefix frontend run lint

# Integridad documental
npm run spec:check
npm run docs:check
```
