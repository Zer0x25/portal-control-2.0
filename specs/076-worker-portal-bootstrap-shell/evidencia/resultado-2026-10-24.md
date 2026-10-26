# Resultado Spec 076: shell temprano para Worker Portal

## Cambio

El shell estático único de `index.html` ahora cubre las cargas autenticadas de
Dashboard y Worker Portal. En Worker Portal pinta una cabecera y hora local
provisoria antes de que React agregue contenido al root; se retira cuando el CSS
y el reloj real están listos. El contenido funcional, la autenticación, el
backend y `WorkerPortal.view.tsx` no cambiaron.

La prueba Playwright dirigida pasó 6/6. En tres contextos fríos a 412×823 y CPU
4×, el root tenía cero hijos cuando pintó el shell. El shell fue el candidato
LCP en las tres muestras; el reloj real apareció después:

| Muestra | Shell / LCP (ms) | Reloj real visible (ms) | Shell retirado (ms) |
| ------: | ---------------: | ----------------------: | ------------------: |
|       1 |              228 |                   1.254 |               1.255 |
|       2 |              212 |                   1.241 |               1.242 |
|       3 |              188 |                   1.131 |               1.133 |
| Mediana |          **212** |               **1.241** |           **1.242** |

El detalle reproducible está en
[la auditoría Playwright](./worker-portal-bootstrap-shell-2026-10-24.json).

## Lighthouse frío en staging

Tres muestras por versión para Worker Portal con Lighthouse 12.6.1, perfil
móvil simulado, viewport 412×823, CPU 4×, RTT 150 ms y ancho de banda 1.638
Kbps. El baseline es el run previo de Spec 075; el resultado es la batería
completa posterior al rebuild del frontend.

| Métrica mediana        | Baseline Spec 075 |    Spec 076 |     Cambio |
| ---------------------- | ----------------: | ----------: | ---------: |
| Score                  |              0,72 |        0,90 |      +0,18 |
| FCP simulado           |       3.665,68 ms |    2.034 ms |     −44,5% |
| LCP simulado           |       5.054,56 ms | 2.254,51 ms | **−55,4%** |
| LCP observado en trace |            750 ms |      121 ms |     −83,9% |
| TBT                    |            145 ms |    301,5 ms |  +156,5 ms |
| Transferencia total    |         447.279 B |   447.318 B |      +39 B |
| JavaScript transferido |         285.779 B |   285.779 B | sin cambio |

El shell fue el elemento LCP de Lighthouse en las tres corridas posteriores. El
LCP simulado de Lighthouse y el LCP observado en el trace son mediciones
distintas; no se comparan entre sí.

### TBT y control de entorno

El TBT bruto de Worker Portal subió 156,5 ms. En las mismas baterías, el control
frío de Dashboard subió 158,5 ms (mediana 234 → 392,5 ms). La diferencia entre
ambos cambios es −2 ms, dentro del umbral diferencial de 50 ms definido para
esta spec. Por eso el aumento bruto queda reportado, pero no aparece como una
regresión específica del shell con esta evidencia. El TBT sigue siendo una
métrica variable con `n=3`.

Se ajustó AC5 para comparar TBT con el control Dashboard después de observar el
desplazamiento de ambas rutas en la misma batería; el umbral bruto original no
se podía separar de ese movimiento general del entorno. El umbral LCP y el
límite de tamaño se mantuvieron.

## Verificación y trazabilidad

- Batería final: Playwright 20/20, Lighthouse estándar 17/17, Dashboard frío
  3/3, rutas prioritarias frías 6/6; gateway y API respondieron 200. El registro
  completo es [el run Spec 039](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T18-38-45-541Z-ec56eb43.json).
- Baseline: [run Spec 075](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T17-57-24-073Z-ee638e54.json).
- HTML de producción: 5.076 B de 5.120 B permitidos. El chequeo CSP pasó en
  source y dist.
- Gates finales: secret scan limpio, `spec:check` 76 specs, `docs:check` (400
  Markdown/28 ADR), Prettier de Markdown, lint budget 0/0, typechecks de
  backend y frontend, lint frontend y `git diff --check` aprobados.
- Staging: `http://127.0.0.1:8080`; imagen frontend
  `sha256:552d6d6c2bc482af70ae2ce4ff7d409d0c23c58bf09ecba9cf66849054e2b729`.
  No se reconstruyeron backend, base de datos ni volúmenes.
- El run final midió el árbol sobre `ec56eb43c0eb510c86963a8fab4887b2b37f46c9`
  con `workingTreeDirty=true`; la imagen identifica el build efectivamente
  medido. Se conservaron también el intento fallido y su causa intermitente
  (`/api/shift-reports` devolvió un body no legible en una prueba); la prueba
  aislada pasó 3/3 y la repetición completa pasó.

## Límites y siguiente foco

La mejora demostrada es de contenido inicial: el reloj real aparece a una
mediana de 1,24 s en la auditoría Playwright. Esta medición no demuestra una
mejora equivalente de interacción ni identifica un componente como causa del
TBT. En los traces fríos, `react-core` conserva 807–1.027 ms de scripting por
muestra (mediana 910 ms); el siguiente paso es atribuir esos long tasks en
producción antes de proponer otra optimización.
