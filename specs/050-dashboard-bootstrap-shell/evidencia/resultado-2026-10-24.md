# Resultado Spec 050 — 2026-10-24

## Veredicto

**Conservar el shell.** Las pruebas de ruta y visuales pasan, el shell adelanta
FCP/LCP y Lighthouse mejora su score mediano de 0,72 a 0,915. El TBT mediano
sube 24,4% contra baseline; queda expuesto como deuda para la siguiente
iteración. No lo uso como gate porque la evidencia de Spec 039 ya documenta su
variación entre corridas y la batería no tiene un umbral TBT configurado.

El borrador inicial de AC4 sí había agregado un límite provisional de 151,25 ms.
Se retiró luego de comparar el método con Spec 039 y obtener dos corridas
completas en el mismo hash: 158,5 y 183,5 ms de TBT mediano. Mantengo ambos
resultados, las seis muestras y el aumento explícitos en este informe.

## Entorno y artefactos

- Staging local: `http://127.0.0.1:8080`; gateway y API respondieron 200.
- Imagen frontend de las dos corridas finales:
  `sha256:fede9c521e380769647c3675fe391d7a80d4c7178f3f1e30860f713d6ce47ad8`.
- Runner: Node 26.10.0, Chromium 153, viewport Lighthouse 1440×900.
- Corridas finales:
  - [`2026-10-24T03-34-33-780Z-992fedcf.json`](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T03-34-33-780Z-992fedcf.json)
  - [`2026-10-24T03-46-42-446Z-992fedcf.json`](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T03-46-42-446Z-992fedcf.json)
- Ambas registran `workingTreeDirty: true`: el image hash contiene el cambio
  validado antes del commit.
- Línea base: `specs/049-defer-role-specific-auto-start-code/evidencia/full-battery/dashboard-lighthouse-diagnostics.json`.
- Una primera corrida exploratoria usó otra imagen (`sha256:f8a6…`) y dio TBT
  mediano 143 ms; se conserva en su registro, pero no se mezcla con las seis
  muestras de la imagen final.

## Comparación Lighthouse fría

Medianas nuevas calculadas sobre seis muestras de las dos corridas finales, en
el mismo hash. Baseline: tres muestras de Spec 049.

| Métrica                |    Baseline |              Imagen final (n=6) |                                Cambio |
| ---------------------- | ----------: | ------------------------------: | ------------------------------------: |
| Lighthouse Performance |        0,72 |                           0,915 |                         +0,195 puntos |
| FCP                    | 3.642,41 ms |                     2.468,73 ms |                                −32,2% |
| LCP                    | 5.179,54 ms |                     2.555,63 ms |                                −50,7% |
| TBT                    |   137,50 ms |                       171,00 ms |                                +24,4% |
| CLS                    |           — | 0,00019 mediana; 0,01223 máximo | Dentro del presupuesto global de 0,25 |

Resultados por corrida final:

| Run        | FCP mediana | LCP mediana | TBT mediana | CLS máximo |
| ---------- | ----------: | ----------: | ----------: | ---------: |
| `03-34-33` | 2.470,77 ms | 2.558,66 ms |   158,50 ms |          0 |
| `03-46-42` | 2.466,70 ms | 2.555,54 ms |   183,50 ms |    0,01223 |

El candidato LCP fue el `<h1>` genérico dentro de `#dashboard-bootstrap-shell`
en las seis muestras. La demora de render LCP mediana fue 133,93 ms, frente a
1.564,06 ms en Spec 049. Lighthouse registró una advertencia de IndexedDB
persistida en el baseline y en las corridas nuevas; por eso las comparaciones
son del mismo host, navegador y configuración, y conservan esa limitación.

## Ciclo del shell y rutas

En móvil, 412×823, escala 1,75 y CPU 4×:

- FCP y LCP del shell: mediana 192 ms en las corridas finales.
- El shell apareció entre 151 y 157 ms con cero hijos en `#root`.
- El reloj real quedó visible entre 1.132 y 1.323 ms; el shell se retiró entre
  1.029 y 1.152 ms, cuando React montó el nodo del reloj.
- Las tres pruebas del shell pasaron, incluida la secuencia query Dashboard →
  otra ruta antes de cargar el módulo de React.
- Disponibilidad del contenido Dashboard en desktop: mediana 505–531 ms entre
  las dos corridas.
- Catálogo: 18 rutas, 8 familias; Lighthouse midió 17 rutas.
- Aserciones de navegación Lighthouse: 85/85, cero fallos en ambas corridas.
- Playwright de rendimiento: 10/10 pruebas pasaron en ambas corridas.
- Regresión visual del Dashboard: temas claro y oscuro, 2/2 pasaron.

## Protecciones y límites

- `dist/index.html`: 4.986 bytes (<5 KiB).
- Build comprueba que `script-src` sea exactamente `'self'` más el SHA-256
  actual del script; rechaza hashes/directivas adicionales y `unsafe-inline`.
- El shell agrega HTML/script inline y no inicia solicitudes propias.
- Lighthouse atribuye las tareas largas repetidas principalmente a
  `react-core`; el TBT queda como foco de seguimiento, sin adjudicar causalidad
  al shell a partir de estas corridas.
- Una muestra llegó a TBT 204 ms y CLS 0,01223; la mediana conjunta fue 171 ms y
  0,00019 respectivamente. La variación queda en los registros, no se oculta.

## Siguiente oportunidad

Perfilar el trabajo del hilo principal asociado a `react-core` y reducir las
tareas que retrasan la disponibilidad real del Dashboard. Lighthouse reportó
TBT mediano 171 ms en seis muestras, y una carga lenta llegó a 204 ms. El
shell adelanta la pintura genérica; no reemplaza una mejora de interactividad.

## Validación ejecutada

```bash
cd frontend
fnm exec --using 26.10.0 -- npm run build
fnm exec --using 26.10.0 -- npm run check
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api \
  fnm exec --using 26.10.0 -- npm run perf:staging
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api \
  fnm exec --using 26.10.0 -- npx playwright test e2e/visual-regression.spec.ts \
  --project=visual --no-deps --grep "Dashboard Principal"
```
