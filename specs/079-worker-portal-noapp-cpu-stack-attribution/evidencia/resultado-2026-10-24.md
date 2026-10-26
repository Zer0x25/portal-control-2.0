# Resultado Spec 079: atribuir CPU sin frame de la app

## Método

Se amplió el perfilador de Chromium para conservar, en forma agregada, la
categoría del frame hoja y el frame fuente mapeado más cercano de las muestras
que no incluyen un frame `src/`. El perfil no guarda URLs ni pilas crudas. Una
prueba sintética confirma que un frame nativo/desconocido se mantiene separado
de su contexto React DOM y que la misma muestra no se suma dos veces.

Se capturaron tres cargas frías del Worker Portal en staging con Chromium 153,
CPU 4×, viewport 412×823 y muestreo de 1 ms. Los source maps locales
coincidieron con los 207 bundles activos; React-core quedó mapeado al 100%.

## Resultado

| Medida                           |                           Mediana |
| -------------------------------- | --------------------------------: |
| CPU activo muestreado            |                        676,480 ms |
| CPU sin frame `src/` cercano     | 394,681 ms (58,3% del CPU activo) |
| React-core inclusivo / propio    |              442,148 / 192,864 ms |
| Cobertura de mapas de React-core |                              100% |

Categorías hoja para el CPU sin frame de la app:

| Categoría                          | Mediana por contexto | Contextos observados |
| ---------------------------------- | -------------------: | -------------------: |
| Dependencia mapeada                |           245,980 ms |                  3/3 |
| Browser/native o frame desconocido |           133,478 ms |                  3/3 |
| Bundle sin mapear                  |            14,113 ms |                  3/3 |
| Otra fuente mapeada                |             0,513 ms |                  2/3 |

Las medianas de categorías se calculan por separado, por lo que su suma puede
diferir de la mediana del total. “Browser/native o desconocido” también incluye
frames sin URL como `anonymous`; no se interpreta todo ese tiempo como trabajo
del DOM. En las pilas con fuente mapeada, React DOM reaparece en
`updateFunctionComponent` (20,940 ms de contexto mediano, 3/3), `setProp`
(9,770 ms, 3/3) y `performUnitOfWork` (9,107 ms, 3/3). El frame hoja React DOM
`renderWithHooks` aparece en las tres capturas con alrededor de 24 ms propios.

Quedan 140,348 ms medianos sin caller fuente mapeado (3/3). Por eso esta corrida
localiza trabajo repetido de React DOM y un grupo nativo/desconocido grande,
pero todavía no vincula esos frames a un componente de la app. No se afirma una
mejora de LCP/TBT ni una regresión respecto de Spec 077: el muestreo CPU tiene
variación entre capturas y no es una comparación Lighthouse.

## Staging, privacidad y siguiente paso

- Imagen frontend medida: `sha256:8cf223b927a58f697ceda99de0a00a04e70888f35ff8b1384fa156677a57b54b`; el runner comprobó que no cambió después.
- Reloj real visible 3/3; errores API 0/3; errores WebSocket 0/3.
- Gateway/readiness HTTP 200 y todos los servicios de staging siguen saludables. No se reconstruyó ni reinició ningún servicio.
- El build local normal quedó restaurado: `frontend/dist/index.html` 5.076 bytes y sin source maps.
- El JSON pasó la aserción de privacidad del perfilador y solo contiene rutas de módulos, nombres saneados y contadores.
- Registro: [perfil de pila agregado](./worker-portal-noapp-cpu-2026-10-24.json).

**Siguiente:** correlacionar los frames repetidos de reconciliación/commit con los
componentes del Worker Portal usando el perfilador React existente; después se
elige una sola actualización o efecto para una prueba A/B. El grupo nativo o
desconocido requiere una traza del navegador específica antes de atribuirlo a
DOM, GC o una operación concreta.
