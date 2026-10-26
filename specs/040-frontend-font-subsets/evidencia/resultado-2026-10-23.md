# Resultado de subconjuntos tipográficos — 2026-10-23

## Resultado confirmado

Las fuentes de Dashboard en frío redujeron su transferencia mediana **68,4 %** y el peso total de la página **30,7 %**. La muestra tipográfica conserva exactamente los mismos píxeles. La tanda de tres muestras no demuestra una mejora de FCP/LCP: sus rangos se solapan con el baseline y las medianas quedaron prácticamente iguales.

| Mediana de 3 muestras frías |         Antes |       Después |         Diferencia |
| --------------------------- | ------------: | ------------: | -----------------: |
| Transferencia de fuentes    | 378.529 bytes | 119.614 bytes | −258.915 (−68,4 %) |
| Transferencia total         | 830.770 bytes | 575.671 bytes | −255.099 (−30,7 %) |
| Solicitudes totales         |            97 |            97 |                  0 |
| Solicitudes de fuentes      |             4 |             4 |                  0 |
| FCP                         |      4.247 ms |      4.383 ms |   +136 ms (+3,2 %) |
| LCP                         |      6.246 ms |      6.218 ms |    −27 ms (−0,4 %) |
| TBT                         |        275 ms |        230 ms |   −46 ms (−16,5 %) |
| Score                       |          0,62 |          0,63 |              +0,01 |

El cambio confirmado es menor transferencia. Las diferencias de tiempo y score son observaciones de laboratorio y no una mejora/regresión estable. Antes FCP varió entre 3.536–4.958 ms y LCP entre 5.461–7.214 ms; después FCP varió entre 4.067–4.405 ms y LCP entre 6.114–6.596 ms. TBT sigue siendo variable, con una muestra de 560 ms después. Una de las muestras posteriores realizó 107 solicitudes; las otras dos realizaron 97.

## Build y método

- Baseline: [corrida anterior](../../039-frontend-performance-battery/evidencia/runs/2026-10-23T13-06-33-525Z-45138318.json), imagen `sha256:ce56846f177f28b394c20ed062b61f579d057a627661d7198f113b297310ceae`.
- Después: [corrida aprobada](../../039-frontend-performance-battery/evidencia/runs/2026-10-23T13-50-47-471Z-45138318.json), imagen `sha256:c7edce32119172ba08f285660f74ffd8a37094a19a5f6bd29505df6e89b6b4ad`.
- Ambos registros usan Node 26.10.0, Chromium 153 y el mismo perfil Lighthouse frío con storage reset. Lighthouse utiliza su emulación/throttling de laboratorio; el viewport 1440×900 del registro corresponde a Playwright.
- Ambos checkouts estaban modificados sobre `45138318f801c54307efd60d6a86a1729313caee`; el commit por sí solo no identifica los builds. Los ids de imagen, archivos solicitados y hashes de fuentes identifican los artefactos medidos.
- Datos completos, muestras y diferencias: [comparison.json](comparison.json). Las fuentes se identifican por los nombres con hash de cada reporte original Lighthouse.

## Implementación y controles

- Se generaron cinco WOFF2 latinos desde originales inmutables con FontTools 4.67.0 y Brotli 1.2.1; no hay una dependencia Python en el runtime ni en el build de Docker.
- Los cuatro archivos habituales de Dashboard suman 117.748 bytes antes de headers; el navegador transfirió una mediana de 119.614 bytes.
- Los rangos CSS disjuntos conservan cobertura: latín/español, marcas combinadas, puntuación y monedas usan los subconjuntos; otros caracteres solicitan el original completo.
- Todas las métricas de línea, anchos y contornos descompuestos de los caracteres incluidos son iguales a los originales. Se conservan hinting, features OpenType, nombres y pesos CSS; los avisos OFL están incluidos.
- `build_subsets.py --check` reprodujo los bytes de los assets. El guard Node de build verifica hashes y el límite de fuentes; los originales conservan sus hashes previos.
- Preload apunta a `Inter-Regular-latin-DZ2H3oP-.woff2`. HTML: 1.716 bytes. Las fuentes siguen fuera del precache y reciben caché inmutable por un año.
- Presupuestos del bundle desplegado: React core 218.860 bytes; charts 145.613; precache 2.038.031 bytes / 187 entradas; todos aprobados. Ver [artifact-checks.json](artifact-checks.json).

El chequeo final corrigió la resolución de configuración Prettier del generador usando `--stdin-filepath`. La regeneración reprodujo los mismos WOFF2 y el rebuild final emitió los mismos **223 archivos byte por byte** que la imagen medida. El id final de staging es `sha256:39cf4012ce2101ab5138a4f6e61a0121cb862535dc8c9d529c03ee76b52b0139`; ver [equivalencia del build](final-build-equivalence.json). La medición anterior sigue representando esos mismos assets y no se repitió Lighthouse por un cambio de formato sin diferencias de distribución.

## Prueba visual y de alfabetos

Las dos pruebas `font-loading.spec.ts` se ejecutaron contra staging reconstruido y pasaron. La captura anterior se realizó antes de modificar los assets y el test posterior comparó los PNG exactamente; SHA-256 compartido: `fc5ec5109bd81e6748476ae33b08feacdcf3528327c676aa79853addeccdc28e`.

La [muestra tipográfica](font-specimen.png) cubre los ocho pesos declarados con tildes, ñ, ü, signos de apertura, monedas, números, reloj y puntuación. [font-latin.json](font-latin.json) prueba que solo se descargaron los cinco archivos pequeños; [font-fallback.json](font-fallback.json) prueba que `ЖΩ` activa Inter Regular y Roboto Mono Bold originales.

Un texto fuera del subconjunto puede necesitar el original y el subconjunto, aumentando el peso de esa visita. El primer uso de caracteres adicionales sin conexión depende del original ya cacheado o del respaldo del sistema; no se añadió precache completo de fuentes.

## Auditoría y corrección del harness

La batería final pasó Playwright **5/5** sobre 18 rutas, Lighthouse estándar **17/17** con aserciones aprobadas y destinos correctos, y Lighthouse frío **3/3**. No se enviaron formularios ni se modificaron registros de negocio.

El primer intento quedó incompleto al preparar Worker Portal. La reproducción aislada mostró hash/ruta y rol correctos, pero el adaptador mezclaba los argumentos y opciones de `waitForFunction` de Puppeteer con el orden de Playwright. Se corrigió a `función, opciones, argumentos`, se exige un shell existente y se añade diagnóstico sin tokens. La reproducción aislada pasó después del arreglo y la batería completa también. El intento fallido permanece registrado y no se usa en la comparación.

## Siguiente foco

Reducir las fuentes quitó unos 259 KB sin cambiar de forma clara el primer render. El siguiente paso es capturar un trace de Dashboard para atribuir el trabajo de JavaScript y renderizado inicial; el conteo de solicitudes de scripts sigue en 84. Revisar los imports iniciales de `vendor`, validación y montaje/sincronización con evidencia antes de elegir qué diferir. Los reportes actuales estiman cero ahorro global para el bloqueo CSS: los ~901 ms de la fila de CSS eran duración del recurso, no una promesa de ahorro.

## Verificación

- Generador reproducible y hashes/cobertura/contornos: aprobados.
- Browser de fuentes 2/2, igualdad visual y respaldo multialfabeto: aprobados.
- Build frontend de staging, presupuesto de bundle/precache y salud: aprobados.
- Batería completa: aprobada; registro enlazado arriba.
- TypeScript y lint budget 0/0: aprobados.

- Formato frontend, hashes generados, spec:check, docs:check y git diff --check: aprobados.
