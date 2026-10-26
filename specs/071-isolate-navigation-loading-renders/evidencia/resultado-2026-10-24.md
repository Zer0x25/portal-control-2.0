# Resultado Spec 071: aislamiento de loading de navegación

## Procedimiento

- Baseline: evidencia de Spec 070, tres contextos fríos de Time Control a
  412×823, CPU 4× y API local de staging.
- Experimento: mover `useNavigationLoading` desde `App` a un controlador
  `React.memo` que devuelve `null`, con un scope Profiler dev separado.
- Ejecución: mismas tres muestras y mismos parámetros. Los tests actuales de
  `useNavigationLoading` y el chequeo TypeScript corrieron sobre el experimento.

## Comparación

| Métrica (`n=3`)                                 |        Baseline Spec 070 |  Extracción experimental |            Cambio mediano |
| ----------------------------------------------- | -----------------------: | -----------------------: | ------------------------: |
| Commits de `app:application` en 1 s             |             26 / 29 / 32 |             26 / 27 / 28 |          29 → 27 (−6,9 %) |
| Commits de `app:application` durante validación |                3 / 3 / 3 |                3 / 3 / 4 |             sin reducción |
| `actualDuration` total de `app:application`     | 403,8 / 529,0 / 535,1 ms | 440,0 / 455,8 / 531,6 ms | −13,8 %, rangos solapados |
| Commits del controller nuevo en 1 s             |                        — |                7 / 8 / 9 |                         — |
| Commits del controller durante validación       |                        — |                1 / 1 / 1 |                         — |

La mediana de commits bajó dos (6,9 %), por debajo del umbral predefinido de
20 %. `app:application` mantuvo tres o más commits durante validación, así que
la extracción no elimina el trabajo que coincide con readiness. El controller
nuevo tuvo ocho commits medianos y movió la suscripción de query-count a otra
rama sin reducir de forma suficiente el total.

## Decisión

Se revirtió la extracción, como exige AC4. No se declara mejora de rendimiento
ni se conserva un cambio funcional. Los tiempos de Profiler dev solo sirven
para atribución; el `actualDuration` total baja en esta muestra, pero los rangos
se solapan y no se usa como prueba de ahorro en producción.

Siguiente foco: medir por separado los cambios de `useControlInternoEnabledQuery`
y del selector de `useAuth` que consume `App`; no asumir que `useNavigationLoading`
origina los renders restantes.

## Verificación y límites

- Tests existentes del hook: 3/3 aprobados; TypeScript frontend aprobado.
- Preflight 6/6 aprobado; lint 0/0 y Spec Check (71 specs) sin errores.
- Tres contextos completos; 206–217 eventos por contexto, cero descartados.
- Vite registró errores Socket.IO/proxy en estos perfiles; el canal no forma
  parte del recolector. Los datos son de Vite development y no comparan con
  producción ni Core Web Vitals.
- Evidencia cruda:
  [`navigation-loading-render-profile-2026-10-24.json`](./navigation-loading-render-profile-2026-10-24.json).
