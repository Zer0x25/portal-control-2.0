# Spec 094: iniciar en paralelo los chunks de Control horario

- Estado: Completada
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

Cinco informes Lighthouse fríos muestran una cascada entre los chunks de
`PersistentLayout` y `TimeControlPage`. La ruta de Control horario empieza a
descargarse después de que termina el chunk del layout: la mediana entre ambos
inicios es 182,418 ms y la mediana desde el fin del layout hasta el inicio de la
ruta es 139,147 ms. La evidencia de origen está en
`./evidencia/time-control-route-chunk-waterfall-before-2026-10-25.json`.

## Alcance

Dentro:

- Preiniciar la importación del chunk de Control horario para un enlace directo
  a esa ruta, antes del primer render y compartiendo el loader con `React.lazy`.
- Mantener lazy la carga de Control horario desde rutas distintas.
- Verificar que la descarga de `TimeControlPage` empiece antes de terminar
  `PersistentLayout`, sin cambiar la ruta final ni el comportamiento de acceso.
- Comparar tres visitas E2E frías, tres perfiles CPU y cinco corridas Lighthouse
  en staging.

Fuera (explícito):

- Cambiar la autorización, los datos, el endpoint, el layout o
  `TimeControl.view.tsx` (`UI-PROTECTED`).
- Declarar una mejora de TBT solo por adelantar la descarga de JavaScript.

## Criterios de aceptación

- [x] AC1: El preloader de enlace directo comparte el loader de
      `React.lazy` y empieza la descarga de ruta antes de montar React. Otras
      rutas conservan su carga lazy.
- [x] AC2: E2E confirma una solicitud por chunk, página visible y comienzo de
      `TimeControlPage` antes de que termine `PersistentLayout`. Dashboard
      conserva su aserción de que no descarga el chunk de Control horario.
- [x] AC3: En tres visitas E2E frías de staging, la ruta empieza antes de
      terminar el layout en 3/3 perfiles. Cada visita registra entre 11 y 12
      requests API y todos responden HTTP 200; los tres perfiles CPU registran
      12 requests por muestra y cero fallos.
- [x] AC4: Cinco corridas Lighthouse se hicieron contra el mismo backend y
      configuración móvil. FCP mediano varió −0,15%, LCP +0,05%, CLS máximo
      quedó estable y la cascada desapareció. TBT mediano subió de 190 a
      217,5 ms, con rangos solapados; no se declara mejora ni regresión causal.

## Restricciones

Solo se precarga el módulo al abrir directamente el hash `#/time-control`.
La ruta sigue pasando por `ProtectedRoute`; el resto de las páginas conserva la
división de código existente. Rollback: quitar la llamada al preloader en
`main.tsx`; `React.lazy` conserva el loader compartido.

## Trazabilidad

- Test E2E: `frontend/e2e/performance.spec.ts`.
- Baseline: `./evidencia/time-control-route-chunk-waterfall-before-2026-10-25.json`.
- Evidencia final: `./evidencia/resultado.md`, perfil de recursos, perfil CPU y
  Lighthouse posterior.
- Bitácora: `.jules/bolt.md`.
