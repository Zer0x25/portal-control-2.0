# Resultado — Spec 043: deduplicación de health en Dashboard

## Cambio

`validateInstanceId()` comparte la query `systemHealth` con el indicador de salud. La validación fuerza una lectura fresca si solo hay datos cacheados, pero se une a la misma solicitud cuando ya está en vuelo. El fallback ante errores, la purga por cambio de instancia y el refresco forzado se mantienen.

## Staging: tres arranques autenticados secuenciales

| Medición             |          Spec 042 |              Spec 043 | Cambio observado |
| -------------------- | ----------------: | --------------------: | ---------------: |
| Solicitudes API      |                21 |        20 por muestra |     −1 (−4,76 %) |
| Endpoints únicos     |                20 |        20 por muestra |            igual |
| Endpoints duplicados | 1 (`/api/health`) |         0 por muestra |               −1 |
| `GET /api/health`    |                 2 |         1 por muestra |               −1 |
| HTTP 200             |                 — | 20/20 en cada muestra |                — |

`main-content` fue visible en mediana de 577 ms y `server-clock` en 675 ms. El último request API terminó en mediana de 688 ms. Los cinco mayores ciclos request-to-finish fueron `/api/leaves` (162,80 ms), `/api/holidays` (162,49 ms), `/api/corrections` (162,39 ms), `/api/shifts/assignments` (160,24 ms) y `/api/configs/email_recipients` (148,48 ms). Estas duraciones incluyen navegador, gateway, backend y transferencia; no son latencia aislada del servidor.

Las capturas completas, offsets y waterfall por endpoint están en [la comparación](comparison.json), [el resumen de duración](api-duration-summary.json) y las [muestras 01](runs/sample-01/dashboard-startup-api-requests.json), [02](runs/sample-02/dashboard-startup-api-requests.json) y [03](runs/sample-03/dashboard-startup-api-requests.json).

## Lighthouse frío

El perfil post-rebuild dio score mediano 0,71, FCP 3.747 ms, LCP 5.416 ms, TBT 94,5 ms y CLS 0. El candidato LCP fue el texto del reloj dentro de `WelcomePanel`; Lighthouse asignó 4.966 ms de render delay mediano. En Playwright, el contenedor del reloj fue visible en mediana de 675 ms. Los marcadores de Playwright no son marcas exactas de pintura y ambos perfiles usan condiciones distintas, así que esta diferencia sirve para orientar una investigación, no para atribuir una causa.

Lighthouse estimó 31.958 bytes de JavaScript no usado en `react-core`; el CPU total de ese chunk fue 952 ms en la muestra mediana. La hoja CSS midió 36.084 bytes y la auditoría estimó 900 ms para esa fila, pero su ahorro global reportado fue 0 ms. No afirmamos una mejora de FCP/LCP/TBT por quitar `/api/health`, ni priorizamos cambios CSS a partir de la estimación por recurso. El detalle de las tres corridas está en [lighthouse-cold-profile.json](lighthouse-cold-profile.json).

## Identidad de staging y límites

- Capturado el 23-10-2026 en `http://127.0.0.1:8080/#/dashboard`.
- Imagen frontend: `sha256:7d004a0bf3e1261d3aaeea2aeee9609628902185b999d8dc23da98fa027731b3`.
- Base de código: commit `ce53d585b56dd696aa46840d0c63eed73c56cb1f` más el parche fuente de la spec; hashes reproducibles en los JSON de evidencia.
- Staging local y semillado; no representa métricas de usuarios reales. El baseline de requests de spec 042 tiene una captura, mientras spec 043 tiene tres.
- Lighthouse es un perfil de laboratorio post-rebuild, no un antes/después controlado que permita aislar el efecto de este cambio.

## Verificación y próximo foco

Tests focalizados, checks de tipos, lint, formato, build, presupuesto de bundle, preflight, `spec:check` y `docs:check` pasan. El request gate de staging pasó 3/3 con cero endpoints duplicados.

El siguiente trabajo debe rastrear por qué el texto del reloj de `WelcomePanel` aparece como candidato LCP con render delay alto y comprobar cuánto depende del trabajo en `react-core` y de la espera de datos inicial del Dashboard. El CSS no queda priorizado: su ahorro global medido por Lighthouse fue cero.
