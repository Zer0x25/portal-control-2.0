# Catálogo ampliado y corrida de rendimiento — 2026-10-23

## Alcance y trazabilidad

- Catálogo: 18 rutas, organizadas en ocho familias. Playwright verifica preparación en las 18; Lighthouse tiene 17 rutas elegibles.
- Entorno: staging local, gateway y API HTTP 200; Chromium 153, Node 26.10.0, viewport 1440×900.
- Imagen frontend: `sha256:ce56846f177f28b394c20ed062b61f579d057a627661d7198f113b297310ceae`.
- Commit del checkout: `45138318f801c54307efd60d6a86a1729313caee`; estado sucio. El id de imagen identifica el staging medido y no se infiere que corresponda al checkout modificado.
- Registro completo: [2026-10-23T13-06-33-525Z-45138318.json](runs/2026-10-23T13-06-33-525Z-45138318.json).

| Familia                    | Rutas                                                          |
| -------------------------- | -------------------------------------------------------------- |
| Acceso                     | Login                                                          |
| Dashboard                  | Dashboard, Dashboard de supervisión                            |
| Datos operativos           | Control horario, Logbook, Registro de Medidores                |
| Planificación              | Planificación mensual, Turnos teóricos, Calendario de turnos   |
| Administración             | Configuración, Governance audit, Design System                 |
| Experiencia del trabajador | Worker Portal, Kiosk                                           |
| Comunicaciones             | Comunicaciones                                                 |
| Gestión de directorios     | Gestión de Empleados, Gestión de Personal, Gestión de Usuarios |

## Resultado de la corrida

- Catálogo: aprobado.
- Playwright: **5/5 pruebas aprobadas**; las 18 rutas tuvieron tres muestras. Todas llegaron a su selector principal y a la ruta esperada.
- Lighthouse estándar: **17/17 rutas**, todos los reportes coincidieron con su URL solicitada y las aserciones configuradas pasaron.
- Lighthouse frío: **3/3 muestras** de Dashboard.
- No se enviaron formularios ni se alteraron datos de negocio.
- El scroll virtualizado de Governance capturó 90 intervalos: p50 16,7 ms, p95 33,4 ms, máximo 50 ms y cero frames sobre 50 ms.

Login se mantiene en Playwright, con mediana de preparación de **277 ms**. Se excluyó de Lighthouse porque Chromium mostraba la pantalla, pero no emitía First Contentful Paint y Lighthouse terminaba con `NO_FCP`, tanto con preset móvil como desktop. La excepción está declarada en `performance-routes.json` y la valida el chequeo del catálogo.

## Señales de carga

| Vista / perfil                 | Score |          FCP |          LCP |        TBT |
| ------------------------------ | ----: | -----------: | -----------: | ---------: |
| Dashboard, estándar            |  0,96 |       236 ms |       940 ms |     243 ms |
| Dashboard de supervisión       |  0,95 |       403 ms |     1.143 ms |     260 ms |
| Governance audit               |  0,89 |       278 ms |     1.354 ms |     440 ms |
| Control horario                |  0,90 |       288 ms |     1.389 ms |     399 ms |
| Worker Portal                  |  0,91 |       228 ms |     1.331 ms |     392 ms |
| Comunicaciones                 |  0,96 |       645 ms |     1.436 ms |     236 ms |
| Turnos teóricos                |  0,97 |       248 ms |       952 ms |     185 ms |
| Dashboard, frío (mediana de 3) |     — | **4.247 ms** | **6.246 ms** | **275 ms** |

En frío Dashboard transfirió una mediana de **830.770 bytes** y realizó 97 solicitudes. Las muestras variaron: FCP 3.536–4.958 ms, LCP 5.461–7.214 ms y TBT 146–569 ms. El lote anterior del mismo staging obtuvo medianas de 5.005/7.242 ms en frío; la variación entre lotes impide atribuir la diferencia a un cambio de producto. La referencia post optimización documentada en `seguimiento-dashboard-2026-10-23.md` fue 4.959/7.220 ms, compatible con el centro observado al reunir las corridas.

El TBT de Turnos teóricos fue **185 ms** en esta repetición; el lote anterior marcó 2.344 ms en la misma ruta. Ese valor no se reprodujo y debe tratarse como outlier hasta obtener nuevas muestras. El TBT más alto de esta corrida fue Governance audit (**440 ms**), seguido por Control horario (**399 ms**) y Worker Portal (**392 ms**). Lighthouse estándar pasa sus umbrales de score, FCP, LCP y respuesta; no existe todavía un umbral para TBT.

## Patrones de interacción registrados

Cada medición se adjunta al id de ruta, familia y probe. Búsquedas locales incluyen el paso al estado vacío; las pestañas miden activación y contenido visible; el modal de lecturas se abre y cierra sin enviar información.

| Ruta / patrón                         | Muestras | Mediana | Máximo |
| ------------------------------------- | -------: | ------: | -----: |
| Turnos teóricos / pestañas diferidas  |        9 |   75 ms | 493 ms |
| Configuración / pestañas diferidas    |        6 |  100 ms | 518 ms |
| Registro de Medidores / abrir panel   |        3 |   55 ms | 128 ms |
| Gestión de Empleados / búsqueda       |        3 |   22 ms | 369 ms |
| Gestión de Personal / pestaña Accesos |        3 |   72 ms | 171 ms |
| Gestión de Usuarios / búsqueda        |        3 |   23 ms | 393 ms |

En las dos búsquedas y pestañas diferidas, las primeras transiciones fueron más lentas que las repeticiones. Conservar todas las muestras evita ocultar el costo inicial del estado/panel diferido cuando después se optimice el patrón compartido.

## Siguiente orden de trabajo

1. Mantener **Dashboard en frío** como primer foco: LCP mediano de 6,25 s y unos 831 KB transferidos, aunque Dashboard estándar y caliente ya registra LCP de 940 ms.
2. Antes de optimizar otra vista, repetir TBT de Governance, Control horario y Worker Portal con la misma batería. El outlier de Turnos teóricos demuestra por qué se necesitan corridas repetidas.
3. Comparar por familia y probe al modificar componentes comunes: las rutas `directory-management` comparten búsqueda/pestañas; las rutas `planning` comparten patrones de pestaña. Mantener Chromium, host, viewport y perfil iguales.
4. Abrir un trace de Lighthouse/Performance para el foco elegido, cambiar un solo costo principal y volver a ejecutar `npm run perf:staging`. Esta corrida documenta cobertura y línea base; no implementa una nueva optimización de producto.
