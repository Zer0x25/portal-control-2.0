# Resultado Spec 107: estabilizar el callback de IntersectionObserver

Fecha: 2026-10-25. Staging local aislado, ruta `/#/time-control`.

## Cambio y regresión

`useIntersectionObserver` conserva una referencia al callback más reciente y ya
no reconstruye el observador cuando esa función cambia en un render. `frozen`
ahora siempre es booleano; con `freezeOnceVisible` apagado no cambia de
`undefined` a `false` después de la primera notificación. Con la opción activada,
el observer sigue desconectándose al intersectar.

La prueba nueva falló antes del fix: después de una entrada que actualizaba el
estado del hook, esperaba un observer y encontró dos. Después del fix, 2/2 casos
pasan, incluida la entrega de la siguiente entrada al callback actualizado. No
se modificó `TimeControl.view.tsx`.

## Perfil React de escritorio

Se hicieron tres muestras por versión con `measure-renders.mjs`, Chromium 153,
Vite en desarrollo, viewport 1440×900 y CPU 4×. Cada muestra usó un contexto
nuevo y navegó directamente a Control horario. Estos datos atribuyen commits y
duración de React en desarrollo; no representan CPU de producción ni TBT.

| Scope                  | Commits antes          | Commits después        | Duración mediana antes | Duración mediana después |
| ---------------------- | ---------------------- | ---------------------- | ---------------------: | -----------------------: |
| `time-control:records` | 16, 8, 15 (mediana 15) | 4, 14, 10 (mediana 10) |    90,1 ms (88,6–92,4) |    113,7 ms (12,1–162,1) |
| `time-control:view`    | 17, 9, 16 (mediana 16) | 4, 16, 11 (mediana 11) | 205,1 ms (188,7–249,5) |   176,3 ms (151,0–259,7) |
| Ruta                   | 17, 9, 16 (mediana 16) | 4, 15, 11 (mediana 11) | 247,5 ms (211,1–306,4) |   205,6 ms (186,7–295,8) |
| `time-control:filters` | 3, 3, 3 (mediana 3)    | 2, 3, 3 (mediana 3)    |    53,3 ms (45,8–75,5) |      40,7 ms (28,2–62,5) |

La mediana de commits observada bajó cinco en el scope de registros y cinco en
la ruta. Los conteos individuales todavía se solapan. La duración del scope de
registros subió en la mediana y tuvo un rango amplio; las duraciones de vista y
ruta también se solapan. El root de React tuvo una mediana de 32 commits antes y
34 después. No hay evidencia de reducción global estable de CPU. Vite reportó
errores EPIPE del proxy de WebSocket en ambos grupos.

La evidencia confirma que el callback ya no causa el reinicio del observer
reproducido por la regresión y muestra menos commits medianos en el scope de la
lista en esta serie. **No se declara mejora de Lighthouse, TBT, INP ni de
duración de producción.**

## Línea base de Lighthouse y perfil de producción

Después del cambio se capturaron cinco visitas frías al mismo build local de
staging, Lighthouse 12.6.1, viewport móvil 412×823, CPU 4× y RTT simulado de
150 ms. La mediana actual es TBT **265 ms**, LCP **2.660 ms** y score **0,89**.
Las cinco muestras superan 200 ms de TBT; LCP tiene un rango amplio por una
muestra de 5,19 s. Esto describe el build actual; no es un A/B con el build
anterior ni demuestra que el cambio del observer haya movido Lighthouse.

| Métrica              |    Mediana |              Rango |
| -------------------- | ---------: | -----------------: |
| Score de rendimiento |       0,89 |          0,72–0,92 |
| TBT                  |     265 ms |         237–321 ms |
| LCP                  | 2.659,6 ms | 2.252,9–5.190,3 ms |
| FCP                  | 2.058,1 ms | 2.015,9–2.445,3 ms |
| CLS                  |          0 |           0–0,0102 |
| Transferencia total  |  457.905 B |  457.841–493.693 B |

Tres perfiles CDP adicionales del bundle de producción coincidieron con los
210 assets de staging y source maps. Hubo 7, 9 y 9 tareas largas durante las
ventanas perfiladas; React core propio acumuló una mediana muestreada de
235,8 ms. `loadTimeControlPage` aparece dentro de tareas largas en 3/3 perfiles,
con 16,9–27,4 ms por muestra. `filterValidIdbItems` aporta 5,6–11,2 ms. La
mediana inclusiva de `apiClient.performRequest` es 42,0 ms, pero el stack cruza
el `fetch` asíncrono y no se interpreta como CPU propia ni como latencia de red.
No hay una función síncrona de aplicación aislada que explique el TBT medido.

Por eso no se inicia otra optimización de runtime con estos datos. La Spec 085
exige atribución repetida y un experimento que baje TBT al menos 20% o lo deje
por debajo de 200 ms; también descarta diferir Socket.IO por conjetura. El
siguiente foco debe identificar una porción de render repetida que pueda
reducirse sin tocar `TimeControl.view.tsx`.

## Verificación

- Tests de `useIntersectionObserver`: 2/2; suite focalizada de listas: 11/11.
- TypeScript frontend, ESLint focalizado, Prettier y build de producción pasan.
- `spec:check`, `docs:check`, `git diff --check` y preflight completo pasan; el
  ratchet de ESLint quedó en 0/0.
- Staging reconstruido solo para frontend; imagen
  `sha256:d0932191a96d83fa08dd042a900c234060a96d961e64e3d24c54d84eb19f29d7`.
  El contenedor quedó `healthy`, el gateway sirvió HTTP 200 y readiness
  respondió `healthy`.
- Playwright contra staging verificó que la lista virtualizada presenta una
  fila con la tipografía contractual: 1/1. La prueba intercepta los registros;
  no hizo marcaciones ni escribió datos de negocio.
- Backend, PostgreSQL y PgBouncer no se reconstruyeron ni modificaron.

## Evidencia cruda

- [Perfil de escritorio antes](./time-control-render-profile-before-desktop.json)
- [Perfil de escritorio después](./time-control-render-profile-after-desktop.json)
- [Resumen Lighthouse frío actual](./time-control-lighthouse-current-2026-10-26.json)
- [Resumen del perfil CDP con source maps](./time-control-source-mapped-profile-current-2026-10-26.json)
