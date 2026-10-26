# Resultado 055: perfil inicial de Control horario

## Medición

- Código frontend local servido por Vite en modo desarrollo; API autenticada de staging en `http://127.0.0.1:8080/api`.
- Tres navegaciones con contexto de navegador nuevo, Node 26.10.0, Chromium 153 y viewport móvil de 412×823. Cada captura acumuló los perfiles durante el primer segundo desde el primer commit de la ruta.
- La consulta de solo lectura para el rango inicial (2026-10-23 a 2026-10-24) respondió HTTP 200 con 2 registros y una página. No se modificaron datos de staging.
- Datos crudos: [`render-profile-2026-10-24.json`](./evidencia/render-profile-2026-10-24.json).

## Resultado

| Scope                     | Commits medianos | `actualDuration` acumulada mediana | `baseDuration` mediana | Máximo por commit mediano |
| ------------------------- | ---------------: | ---------------------------------: | ---------------------: | ------------------------: |
| Árbol `time-control`      |               12 |                            64,3 ms |               109,1 ms |                   24,1 ms |
| Vista `time-control:view` |               12 |                            32,9 ms |                66,3 ms |                   22,0 ms |

La diferencia mediana entre ambos scopes es 31,4 ms en el primer segundo. Como el perfil anidado cubre la vista y sus descendientes, esa diferencia representa trabajo fuera de la vista, principalmente el render del contenedor y su orquestación de hooks. Es una inferencia del límite anidado, no un costo exclusivo de una función. Hubo 1 montaje, 9 actualizaciones y 2 nested updates en la mediana de ambos scopes.

## Interpretación y límites

- La página solo obtuvo dos registros de staging; esta muestra no representa una carga grande ni permite evaluar el enriquecimiento por fila bajo volumen.
- Estos tiempos corresponden a React Profiler en desarrollo sin throttle. No equivalen al LCP, TBT ni CPU de producción. La batería fría previa de Spec 039 seguía mostrando un retraso observado del candidato LCP de alrededor de 1,66 s y TBT Lighthouse mediano de 257,5 ms; esta medición no demuestra una mejora de esas métricas.
- El perfil localiza parte del trabajo en el contenedor, pero no identifica aún qué hook o componente explica el retraso de producción. No se aplicó una optimización funcional a partir de esta evidencia.
- El siguiente paso es obtener un perfil CPU de producción para Control horario e identificar el candidato LCP y el trabajo de `react-core` durante el arranque antes de escoger el cambio.
