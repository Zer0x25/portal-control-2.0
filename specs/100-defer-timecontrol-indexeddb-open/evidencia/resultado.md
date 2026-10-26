# Resultado Spec 100: diferir apertura de IndexedDB

## Cambio y decisión

Se retiró la llamada de nivel superior `initDB()` de `indexedDB.ts`. La primera
operación CRUD sigue llamando la inicialización memoizada, y las llamadas
concurrentes comparten la misma promesa. Nombre, versión, stores, índices,
migraciones y formato de los datos no cambiaron.

El cambio cumple el gate definido antes de medir: la mediana Lighthouse TBT bajó
10,03%, tres de cinco muestras quedaron bajo el mínimo de la base y la mediana
LCP varió +0,03%. Se conserva como mejora de laboratorio, con la variación
descrita abajo; no es una garantía de TBT de campo ni atribuye todo el cambio a
esta línea.

## Entorno y perfil CPU

- Base: imagen frontend staging `sha256:504515aa80db81e3a28a45f151d8d9f09e78c8a4591569af6b041ed6672f4134` de Spec 099.
- Candidata: `sha256:032e4976923b9820f244a510b2d468b9f13d8455fb738e16aa76de21c2fbc65d`.
- Tres navegaciones frías por versión, Control horario, Chromium 153, viewport
  412×823, CPU 4×, assets con source maps verificados.

| Medición                          |                  Spec 099 base |           Spec 100 candidata | Resultado                           |
| --------------------------------- | -----------------------------: | ---------------------------: | ----------------------------------- |
| CPU activo mediano                | 863,860 ms (765,164–1.887,768) | 764,954 ms (737,806–787,698) | −11,45%; intervalos se solapan      |
| React core propio mediano         |                     236,114 ms |                   201,912 ms | menor en esta serie                 |
| Tareas largas por visita          |                       15, 8, 7 |                      7, 6, 7 | mediana 8 → 7                       |
| `initDB` como frame de aplicación |               39,568 ms en 1/3 |         no muestreado en 3/3 | se quitó la apertura en importación |
| Creación de stores/indexes        |      21,327 y 11,366 ms en 2/3 |              5,954 ms en 1/3 | se observa una apertura más acotada |
| Requests API capturados           |           11, 12, 12; 0 fallos |         12, 12, 12; 0 fallos | las 36 respuestas candidatas: 200   |

El perfil confirma que la lectura ocurre después, al usar IndexedDB: una muestra
candidata aún registró `createStoreWithSyncIndexes`. La función no desapareció
del flujo de datos; se retiró su arranque como efecto lateral de importación.
La caída de CPU activo apoya el cambio, pero sus rangos se solapan y `n=3` no
permite asegurar una reducción general.

## Lighthouse frío

Cinco corridas móviles por versión con Lighthouse 12.6.1, CPU 4×, RTT 150 ms y
viewport 412×823. Ambas usaron el mismo backend staging y guardaron solo métricas
agregadas en este registro; las URLs y respuestas no se conservan.

| Métrica       |                  Spec 099 base |              Spec 100 candidata | Cambio mediano |
| ------------- | -----------------------------: | ------------------------------: | -------------: |
| TBT           |           194,5 ms (185,5–307) |              175 ms (117,5–349) |        −10,03% |
| LCP           | 2.252,93 ms (2.250,2–5.205,08) | 2.253,61 ms (2.250,54–4.015,85) |         +0,03% |
| FCP           |                    2.020,95 ms | 2.008,41 ms (1.995,21–2.812,46) |         −0,62% |
| CLS mediano   |                        0,01000 |                         0,01016 |        estable |
| Score mediano |                           0,90 |                            0,92 |          +0,02 |

Tres de cinco TBT candidatas quedaron bajo el mínimo base de 185,5 ms; una fue
245 ms y otra 349 ms. Una muestra LCP candidata llegó a 4.016 ms. La variación
sigue alta, aunque la mediana pasó el umbral preacordado y LCP mediano no empeoró
de forma material. Lighthouse solo observó 2–3 requests API por corrida; los
perfiles CPU capturaron las 12 solicitudes de cada visita y no tuvieron errores.

## Validación

- La prueba nueva pasó roja antes y verde después: el módulo ya no llama
  `openDB` al importarse y conserva una sola promesa en el primer uso.
- 14/14 pruebas focalizadas: ciclo de vida IndexedDB, sync frío y fallback de
  caché offline en `useTimeRecordsQuery`.
- TypeScript frontend, ESLint y Prettier pasaron.
- Frontend staging reconstruido; `clockVisible=true`, 36/36 respuestas API
  HTTP 200 y readiness `healthy`.
- Preflight completo: todas las seis etapas pasaron (secret scan, spec check,
  docs check, Markdown format, lint budget y TypeScript backend/frontend).
- Staging permanece saludable: backend, frontend, PostgreSQL y PgBouncer
  `healthy`; gateway `running`. El frontend continúa en la imagen candidata
  `sha256:032e4976923b9820f244a510b2d468b9f13d8455fb738e16aa76de21c2fbc65d`.
- No se modificó esquema, cuentas ni datos compartidos.

## Evidencia

- [Perfil CPU candidata](./time-control-production-cpu-after-2026-10-25.json)
- [Lighthouse candidata](./time-control-lighthouse-after-2026-10-25.json)
- [Perfil CPU base Spec 099](../../099-time-control-readonly-query-observers/evidencia/time-control-production-cpu-after-2026-10-25.json)
- [Lighthouse base Spec 099](../../099-time-control-readonly-query-observers/evidencia/time-control-lighthouse-after-2026-10-25.json)
