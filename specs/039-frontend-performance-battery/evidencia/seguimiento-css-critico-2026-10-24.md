# Seguimiento del CSS crítico del Dashboard — 2026-10-24

## Veredicto

**Conservar el handoff de CSS.** Frente a la corrida fría comparable antes del cambio, las medianas de FCP y LCP bajaron más de 250 ms y las guardas de estilo pasan para el Dashboard y para otra ruta. TBT subió en la mediana y queda reportado como señal, sin gate duro por su variación histórica.

## Método y artefactos

- Corrida final: [`2026-10-24T07-19-00-817Z-465361c6.json`](./runs/2026-10-24T07-19-00-817Z-465361c6.json).
- Baseline: [`2026-10-24T05-47-44-993Z-90a9f766.json`](./runs/2026-10-24T05-47-44-993Z-90a9f766.json), anterior al handoff y sobre el mismo staging.
- Staging local: `http://127.0.0.1:8080`; gateway y API respondieron 200.
- Imagen medida: `sha256:5d16413af719de62e957f4cd7ff42c07ef6fe8e6c535d1845a92ff6f6072a490`.
- Node 26.10.0, Chromium 153, Lighthouse 12.6.1; perfil Lighthouse móvil 412×823, CPU 4×, RTT 150 ms y 1.638,4 Kbit/s.
- El registro marca `workingTreeDirty: true`: el digest identifica el frontend construido con el handoff y fallback del timeout antes de crear este commit.

## Dashboard frío: antes y después

Cada cifra muestra las tres muestras Lighthouse y la mediana. Delta calculado como después menos antes.

| Métrica                          | Antes                                               | Después                                             | Cambio mediano      |
| -------------------------------- | --------------------------------------------------- | --------------------------------------------------- | ------------------- |
| FCP                              | 2.598,02 / 2.455,24 / 2.462,41 ms; mediana 2.462,41 | 2.070,64 / 2.021,53 / 2.026,99 ms; mediana 2.026,99 | −435,42 ms (−17,7%) |
| LCP                              | 2.792,03 / 2.554,85 / 2.558,12 ms; mediana 2.558,12 | 2.252,45 / 2.253,80 / 2.257,48 ms; mediana 2.253,80 | −304,32 ms (−11,9%) |
| TBT                              | 322,50 / 128 / 187 ms; mediana 187                  | 413 / 177,50 / 244 ms; mediana 244                  | +57 ms (+30,5%)     |
| Score                            | 0,85 / 0,92 / 0,91; mediana 0,91                    | 0,92 / 0,92 / 0,93; mediana 0,92                    | +0,01               |
| Transferencia                    | 448.322 / 448.333 / 448.314 B; mediana 448.322      | 448.790 / 448.767 / 448.775 B; mediana 448.775      | +453 B (+0,1%)      |
| Solicitudes                      | 81 / 81 / 81                                        | 81 / 81 / 81                                        | Sin cambio          |
| Cadena de dependencias más larga | 661 / 559 / 658 ms; mediana 658                     | 676 / 687 / 660 ms; mediana 676                     | +18 ms              |

FCP y LCP superan el umbral de mejora de 250 ms. TBT mediano subió 57 ms y una muestra llegó a 413 ms; queda como señal de seguimiento, no como veto, porque el perfil históricamente varía entre corridas. Las 81 solicitudes se mantienen y la transferencia solo subió 453 B.

## Cobertura y guardas

- Lighthouse estándar: 17 rutas, **85/85** aserciones aprobadas.
- Playwright: **13/13** pruebas aprobadas; incluye el shell claro/oscuro, la ruta Control horario con CSS detenido y el fallback del timeout.
- Las tres capturas frías de Worker Portal coinciden con la ruta y rol `worker`; las de Control horario coinciden con `admin`.
- Con CSS detenido, Dashboard conserva fondo, color, tarjeta y ancho del shell en ambos temas. La captura de Control horario mantiene el fondo oscuro y `#root` oculto hasta aplicar el CSS completo; no muestra contenido sin estilo.
- `dist/index.html`: **5.076 bytes**, 44 bytes bajo el límite de 5 KiB. El hash CSP transformado y construido coincide con las dos políticas Nginx.
- La hoja completa sigue siendo `assets/index-*.css`; el shell no agrega solicitudes. Lighthouse no informa recursos CSS bloqueantes para el Dashboard después del handoff.

Las corridas `06-17` y `06-35` se conservan en el historial, pero no se usan para aceptar el cambio porque se capturaron antes de la guarda contra contenido sin estilo en rutas no Dashboard.

## Próximo foco

Control horario tiene la mayor oportunidad de carga fría del conjunto: mediana FCP/LCP/TBT de **4.353,35 / 6.472,80 / 232 ms**, score 0,62, 107 solicitudes y una cadena de dependencias de 763 ms. Su trace observado muestra LCP de 1.678 ms, con 1.675 ms de demora de render del elemento; `react-core` tiene cerca de 2,0 s de CPU atribuido y la muestra más lenta registra una tarea de 331 ms. Lighthouse estima 55 KB de JavaScript sin uso en esta ruta. Worker Portal registró **3.939,12 / 5.646,48 / 163 ms**, score 0,68 y 88 solicitudes. Perfilar el montaje y los módulos de Control horario antes de elegir una optimización. En Lighthouse estándar, Dashboard tuvo el TBT mayor (306 ms), seguido de Gestión de personal (295 ms), Worker Portal (253 ms) y Control horario (225,5 ms).

## Límites

Son tres muestras por ruta en un staging local y un host; orientan la siguiente iteración y no representan un SLO de producción. El resultado es una comparación mediana sobre el mismo perfil, con dos imágenes frontend distintas. No se cambiaron datos de negocio, servicios backend, umbrales Lighthouse ni producción.
