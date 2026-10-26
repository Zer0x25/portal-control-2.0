# Resultado 042: menos consultas redundantes al iniciar Dashboard

## Cambio

`useEmployees()` ahora deja desactivada la query pública del kiosco. `useEmployees(true)` sigue cargándola sin token, con caché persistida para el uso offline.

`runSync` respeta el `staleTime` de las queries activas y se une a los fetches que ya están en curso, sin cancelarlos. Cuando `validateInstanceId()` detecta otro servidor, la sincronización invalida y vuelve a consultar los datos activos para impedir que sobreviva información de la instancia anterior. Las invalidaciones de sockets y mutaciones siguen usando su ruta existente.

## Solicitudes API en Dashboard

| Medida                 | Spec 041 | Spec 042 | Cambio observado |
| ---------------------- | -------: | -------: | ---------------: |
| Solicitudes API        |       32 |       21 |     −11 (−34,4%) |
| Endpoints únicos       |       21 |       20 |               −1 |
| Endpoints repetidos    |       11 |        1 |              −10 |
| Llamadas repetidas     |       11 |        1 |              −10 |
| `/api/employees/kiosk` |        2 |        0 |               −2 |

La única ruta repetida en la nueva captura es `/api/health` (2 solicitudes): una valida la instancia y otra alimenta el indicador de salud. Una repetición del test a las 23:09 UTC volvió a observar 21 solicitudes y el mismo endpoint repetido. El test E2E ahora falla si se repiten otras rutas o si Dashboard vuelve a solicitar la lista del kiosco.

La captura anterior viene del perfil CDP de la spec 041, detenido 1.500 ms después de mostrar `server-clock`. La captura nueva escucha requests desde Playwright y espera 800 ms sin tráfico API. El lote completo registró 21 solicitudes; una repetición enfocada a las 23:09 UTC volvió a medir 21. Como las ventanas de captura difieren, tomo la caída de 32 a 21 como una comparación observada y no como una estimación causal repetida.

## Lighthouse frío

Se comparan las tres muestras frías de la batería anterior y las tres del staging reconstruido. Las rutas y el gate de las 85 aserciones Lighthouse permanecieron correctos.

| Métrica mediana        |    Spec 041 |    Spec 042 |    Cambio |
| ---------------------- | ----------: | ----------: | --------: |
| Score                  |        0,68 |        0,67 |     −0,01 |
| FCP                    | 3.784,73 ms | 3.808,92 ms | +24,19 ms |
| LCP                    | 5.508,43 ms | 5.598,99 ms | +90,56 ms |
| TBT                    |      190 ms |    221,5 ms |  +31,5 ms |
| Transferencia total    |   470.917 B |   473.684 B |    +0,59% |
| Transferencia JS       |   304.922 B |   308.417 B |    +1,15% |
| Solicitudes Lighthouse |          89 |          89 |     igual |

No aparece mejora temporal de carga en Lighthouse. LCP, TBT, transferencia y score tienen rangos de muestras que se solapan; FCP sube 24 ms en esta tanda pequeña. No atribuyo una regresión estable ni una mejora de Core Web Vitals a este cambio. La mejora comprobada es de tráfico API al arrancar; no cambió la cantidad de solicitudes de recursos que Lighthouse cuenta.

## Validación

- 7 tests unitarios nuevos pasan: kiosco fuera/dentro de modo, query fresca, invalidada, en vuelo y cambio de instancia.
- Staging reconstruido y sano en `http://127.0.0.1:8080`; imagen frontend: `sha256:51e1866eff3c5987eebc655801175014f6d70d71c2f57e76cd6707c4dbd3cd8f`.
- E2E enfocado: notas diferidas y 3 flujos offline (incluido kiosco), 4/4; test de solicitudes de Dashboard, 1/1.
- Batería completa: 6/6 Playwright, 18 rutas con tres muestras de readiness, 17 destinos Lighthouse y 85/85 aserciones; 3/3 rutas frías de Dashboard correctas.
- TypeScript, ESLint, formato, lint budget 0/0, build, presupuesto de bundle, `spec:check` y `docs:check` pasan.

El [registro íntegro de la batería](../../039-frontend-performance-battery/evidencia/runs/2026-10-23T22-55-31-580Z-45138318.json) ata las mediciones Lighthouse al build. La [captura de requests](dashboard-startup-api-requests.json) y la [comparación estructurada](comparison.json) guardan rutas, hash de imagen y límites.

## Siguiente foco observado

Resolver si `/api/health` puede compartir la respuesta entre la validación de instancia y el indicador de salud, manteniendo detección correcta de cambios de base. Después medir la necesidad y el orden de las 20 rutas API únicas restantes del Dashboard antes de optimizar `useScheduling` o la disponibilidad de `kpis/overview`.
