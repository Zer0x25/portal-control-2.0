# Resultado Spec 077: atribución CPU de producción para Worker Portal

## Método y seguridad

Se perfiló directamente el bundle activo de staging en tres contextos Chromium
fríos, autenticados como Worker, con viewport 412×823, DPR 1,75, CPU 4× y
muestreo CDP de 1 ms. Cada muestra navegó a `#/worker-portal` y esperó el reloj
real. No se enviaron mutaciones.

El build local de producción con source maps coincidió con los 207 scripts
JavaScript servidos por staging tras retirar únicamente la anotación
`sourceMappingURL`. Los mapas quedaron en el equipo local; el script reconstruyó
el `dist` normal al terminar y verificó la misma imagen de staging antes y
después. El JSON contiene paths fuente relativos y agregados numéricos, sin
tokens, credenciales, cuerpos, orígenes, query strings ni fragmentos.

## Resultado

| Muestra | Ventana perfil (ms) | CPU activo (ms) |   Idle (ms) | Program (ms) | Cobertura source map `react-core` | Reloj | API fallida | WS error |
| ------: | ------------------: | --------------: | ----------: | -----------: | --------------------------------: | :---: | ----------: | -------: |
|       1 |           2.399,147 |         672,953 |   1.236,550 |      489,644 |                            99,8 % |  Sí   |           0 |        0 |
|       2 |           1.966,226 |         651,933 |     897,205 |      417,088 |                            99,8 % |  Sí   |           0 |        0 |
|       3 |           2.123,866 |         650,831 |     921,134 |      551,901 |                           100,0 % |  Sí   |           0 |        0 |
| Mediana |       **2.123,866** |     **651,933** | **921,134** |  **489,644** |                        **99,8 %** |  3/3  |         0/3 |      0/3 |

El tiempo muestreado de `react-core` tuvo medianas de 433,361 ms inclusivos y
176,955 ms propios. El frame aplicativo más cercano no cubrió una mediana de
384,878 ms del CPU activo, así que el informe conserva ese trabajo como no
atribuido a `src/` y no lo suma artificialmente a una función de la aplicación.
Las medianas de `active`, `idle` y `program` se presentan separadas; estos
perfiles sirven para localizar trabajo, no para comparar LCP/TBT ni atribuir una
mejora de Lighthouse.

## Frames repetidos

| Frame mapeado                                                           | Tiempo inclusivo mediano | Tiempo propio mediano | Presencia |
| ----------------------------------------------------------------------- | -----------------------: | --------------------: | --------: |
| `src/services/apiClient.ts:384` `performRequest`                        |                46,318 ms |             17,509 ms |       3/3 |
| `src/features/worker-portal/hooks/useWorkerPortalData.ts:154` `useMemo` |                15,708 ms |             15,708 ms |       3/3 |
| `src/App.tsx:48` callback de `WorkerPortalPage` lazy                    |                16,556 ms |            0 muestras |       3/3 |

`useMemo` en la línea 154 crea 12 etiquetas mensuales; dentro del bucle llama a
`toLocaleString("es-CL", ...)` para cada fecha. Es un experimento acotado y
repetible, aunque su costo es cerca de 2,4 % de la mediana de CPU activo bajo
CPU 4×. `performRequest` tiene mayor tiempo inclusivo, pero su tiempo propio es
17,509 ms y el perfil no atribuye su parte inclusiva a una etapa concreta de
red o decodificación. Ninguno de estos valores prueba por sí mismo una mejora
visible ni explica todo el TBT.

## Estado del entorno y artefactos

- Imagen frontend activa antes/después: `sha256:552d6d6c2bc482af70ae2ce4ff7d409d0c23c58bf09ecba9cf66849054e2b729`.
- Staging gateway y API readiness: HTTP 200; WebSocket abrió 1 conexión, recibió 2 frames y no registró errores en cada muestra.
- `frontend/dist/index.html`: 5.076 B; no quedan source maps en `dist`.
- No se modificó `frontend/src/`, la configuración Vite, backend, base de datos ni volúmenes.
- Registro agregado reproducible: [perfil CPU](./worker-portal-production-cpu-2026-10-24.json).
- Baseline de bundles/imagen: commit `8a23028930cb7ff8ee75ff2a9006e2d92d68c0ee`, imagen identificada arriba; el árbol estaba dirty porque el perfilador se estaba implementando.

## Siguiente experimento

La atribución revela trabajo repetido, pero no un hotspot grande suficiente para
prometer una ganancia de página. La prueba funcional de menor riesgo sería
reutilizar un único `Intl.DateTimeFormat` para las 12 etiquetas y comparar el
CPU propio de `useMemo` con este registro; solo se conservaría si la mejora
supera el umbral medible de la siguiente spec. Para abordar TBT general hace
falta otro perfil que explique el trabajo de React/DOM sin frame aplicativo.
