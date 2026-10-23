# Spec 038: Mapa de migración `sap-*` → `token-*`

Inventario de partida en `frontend/src`: 431 usos de producción y un uso de
test. El test usaba `sap-blue` y migra al mismo destino
`token-accent-brand`. La migración mantiene cada intención de color en la
familia canónica `token-*`; no agrega ni renombra tokens públicos.

| Token retirado                                                                       | Usos | Destino                | Criterio                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------ | ---: | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sap-blue`                                                                           |  362 | `token-accent-brand`   | Es el alias histórico de `--accent-professional`; conserva el acento adaptable claro/oscuro.                                                                                                  |
| `sap-light-blue`                                                                     |    8 | `token-accent-brand`   | Era una variante fija (`#007bff`) sin token semántico independiente. Se consolida en el acento de marca; los destinos de gradiente usan una parada con opacidad para conservar la transición. |
| `sap-blue-dark`                                                                      |    1 | `token-accent-brand`   | El alias no estaba declarado en `@theme`, por lo que el hover no generaba CSS. Se usa el acento adaptable.                                                                                    |
| `sap-error`                                                                          |   36 | `token-status-error`   | Estado genérico de error.                                                                                                                                                                     |
| `sap-success`                                                                        |   14 | `token-status-success` | Estado genérico de éxito.                                                                                                                                                                     |
| `sap-warning`                                                                        |   10 | `token-status-warning` | Estado genérico de advertencia.                                                                                                                                                               |
| `sap-gray`, `sap-bone`, `sap-dark-gray`, `sap-medium-gray`, `sap-border`, `sap-info` |    0 | Sin reemplazo          | Declaraciones obsoletas sin consumidores; se eliminan junto con la familia.                                                                                                                   |

No se cambia la semántica de los 71 tokens `token-*` existentes. Los cuatro
usos `dark:text-sap-light-blue` se normalizan a `dark:text-token-accent-brand`;
los tres destinos `to-sap-light-blue` usan `to-token-accent-brand/60` y la
parada intermedia `via-sap-light-blue` usa `via-token-accent-brand/75`.
