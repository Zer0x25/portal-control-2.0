# Resultado Spec 094: iniciar en paralelo los chunks de Control horario

- Estado: verificado en staging local.
- Fecha: 2026-10-25.
- Frontend staging: `sha256:f30c8645d15e8bf3ecc3e4cdc41c27321debcaa9992c45f394cc44c921693678`.
- Backend: el mismo servicio de staging usado para la línea base.

## Cambio implementado

`App.tsx` exporta un loader compartido entre `React.lazy` y el preloader. Al
abrir directamente `#/time-control`, `main.tsx` llama el preloader antes de
`root.render`. Las otras rutas siguen cargando sus chunks bajo demanda. La
autorización permanece en `ProtectedRoute`.

La primera variante dentro de un efecto React redujo la espera en escritorio,
pero no logró solapar las descargas en móvil con CPU 4×. Se movió el inicio al
punto de entrada y se conservó la aserción temporal para detectar esa
diferencia.

## Evidencia de carga

En la línea base Lighthouse, el chunk de Control horario empezaba a descargarse
139,147 ms después del fin del layout (rango 93,349–159,214 ms). Con el cambio,
en las cinco corridas Lighthouse:

- La ruta empezó 30,906–78,318 ms antes que el layout (mediana 74,120 ms).
- La ruta terminó 50,907–95,919 ms antes que el layout (mediana 92,010 ms).
- El E2E móvil frío confirmó la misma dirección en 3/3 visitas; la ruta empezó
  entre 137,4 y 158,8 ms antes del fin del layout.
- Cada E2E registró 11–12 requests API y todas respondieron HTTP 200. Los tres
  perfiles CDP registraron 12 requests por muestra y cero respuestas fallidas.
- Cada chunk se solicitó una vez; el editor de marcas siguió ausente. La prueba
  de Dashboard confirmó que no descarga el chunk de Control horario.

La captura E2E está en
[`time-control-route-chunk-waterfall.json`](./time-control-route-chunk-waterfall.json),
la línea base en
[`time-control-route-chunk-waterfall-before-2026-10-25.json`](./time-control-route-chunk-waterfall-before-2026-10-25.json)
y la atribución CDP en
[`time-control-production-cpu-after-2026-10-25.json`](./time-control-production-cpu-after-2026-10-25.json).

## Lighthouse y límite de la conclusión

Cinco corridas móviles con el mismo backend muestran estos medianos frente a la
captura anterior:

| Métrica                  |       Antes |     Después | Lectura                                     |
| ------------------------ | ----------: | ----------: | ------------------------------------------- |
| FCP                      | 2.012,02 ms | 2.008,96 ms | −0,15%                                      |
| LCP                      | 2.253,92 ms | 2.254,98 ms | +0,05%                                      |
| TBT                      |      190 ms |    217,5 ms | Rangos 134–626,03 y 168,5–367 ms se solapan |
| CLS máximo               |     0,01016 |     0,01016 | Estable                                     |
| Transferencia JS mediana |   301.065 B |   301.175 B | +110 B                                      |
| Solicitudes medianas     |          85 |          86 | +1                                          |
| Puntaje de rendimiento   |        0,92 |        0,88 | Variable; no se atribuye causalidad         |

FCP, LCP y CLS quedan dentro de los límites fijados. La cascada de descarga
desaparece de forma repetida, por lo que se conserva el cambio. TBT no mejoró
de forma demostrable: su mediana aumentó y los rangos se solapan. Esta
optimización acredita el inicio temprano de la ruta, no una ganancia de TBT.

El resumen y las cinco muestras están en
[`time-control-lighthouse-after-2026-10-25.json`](./time-control-lighthouse-after-2026-10-25.json).

## Verificaciones

- E2E dirigido de ruta y Dashboard: 2/2 pasaron; captura fría repetida: 3/3.
- TypeScript frontend, ESLint de `App.tsx` y `main.tsx`, Prettier y `spec:check`
  pasaron.
- El perfilador CDP verificó que los 208 assets correspondían al bundle de
  staging y restauró el build frontend normal sin source maps.
- El preflight local completo pasó antes del commit: secretos, spec, docs,
  formato Markdown, lint budget 0/0 y TypeScript de backend/frontend.
