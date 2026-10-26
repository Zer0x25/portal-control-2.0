# Resultado de rendimiento: bienvenida temprana del Dashboard

## Cambio

Se muestra `WelcomePanel` durante la carga inicial del overview o de los reportes. El spinner de sincronización permanece y los widgets siguen sin montarse hasta que los datos estén listos. No cambian queries ni solicitudes de red.

## Medición en staging local

Tres capturas Playwright autenticadas, secuenciales, contra `http://127.0.0.1:8080/#/dashboard`:

| Métrica                |  Spec 043 |  Spec 044 | Variación |
| ---------------------- | --------: | --------: | --------: |
| `main-content` visible | 576,95 ms | 557,37 ms | −19,58 ms |
| Reloj visible en DOM   | 674,76 ms | 621,42 ms | −53,34 ms |
| Solicitudes API        |        20 |        20 |         0 |
| Endpoints repetidos    |         0 |         0 |         0 |
| Respuestas HTTP 200    |        20 |        20 |         0 |

Overview o reportes seguían en vuelo cuando Playwright observó el reloj en 1 de 3 capturas. La diferencia de 53 ms es una señal pequeña de contenido disponible antes; el marcador `toBeVisible` no mide exactamente el fotograma pintado.

Tres corridas Lighthouse frías:

| Métrica                            |    Spec 043 |    Spec 044 | Variación |
| ---------------------------------- | ----------: | ----------: | --------: |
| Performance score                  |        0,71 |        0,71 |         0 |
| FCP                                | 3.747,36 ms | 3.759,76 ms | +12,40 ms |
| LCP                                | 5.415,69 ms | 5.423,07 ms |  +7,38 ms |
| TBT                                |     94,5 ms |      108 ms |  +13,5 ms |
| CLS                                |           0 |           0 |         0 |
| Demora de render del candidato LCP | 4.965,63 ms | 4.971,61 ms |  +5,98 ms |

Los rangos de LCP se solapan. Lighthouse sigue identificando el texto del reloj como candidato LCP, pero esta ronda no demuestra una mejora de LCP, FCP o TBT ni un cambio causal. La mejora observada se limita a la visibilidad temprana del DOM en Playwright.

## Validación y entorno

- Staging: imagen frontend `sha256:dd1b9226211b3d7d0bc1a7f391c2d387eb75e54acb22012f1c2bfa42f8f7b920`; backend y gateway se mantuvieron en la instancia local existente.
- El conteo interno fue 20/20 respuestas HTTP 200 en las tres capturas; no se solicitaron endpoints duplicados ni la lista de kiosco.
- Evidencia de inicio: [resumen de muestras](./dashboard-startup-api-requests.json) y [captura 01](./runs/sample-01/dashboard-startup-api-requests.json), [02](./runs/sample-02/dashboard-startup-api-requests.json), [03](./runs/sample-03/dashboard-startup-api-requests.json).
- Lighthouse: [perfil frío y métricas por corrida](./lighthouse-cold-profile.json); comparación con spec 043: [comparison.json](./comparison.json).
- Laboratorio local, usuario semillado y tres repeticiones: no son Core Web Vitals de usuarios reales.

## Siguiente foco

El cambio desacopla la bienvenida de overview/reportes, pero no mueve el LCP de laboratorio. El siguiente foco es el costo de renderizado y JavaScript de arranque: en este perfil, `react-core` consumió una mediana de 974,70 ms de CPU y Lighthouse estimó 32.280 bytes de JavaScript no usado. Antes de otra edición, instrumentar qué trabajo de JS ocupa el hilo principal antes del LCP y qué consultas de shell compiten con las del Dashboard.
