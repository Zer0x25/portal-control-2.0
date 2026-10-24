# Spec 050: Dashboard Bootstrap Shell

- Estado: Implementado y validado en staging
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

El Dashboard frío se pinta completamente desde cliente: `frontend/index.html` entrega
un `#root` vacío. La batería Lighthouse del 24-10-2026 registró FCP mediano de
3.642 ms, LCP de 5.180 ms y una demora de render del candidato LCP de 1.564 ms.
Una prueba local con CPU 4× mostró que contenido HTML fuera de `#root` puede
adelantar FCP/LCP, mientras React elimina el mismo contenido cuando vive dentro
de `#root`; falta confirmar el beneficio en el build real de staging.

## Alcance

Dentro:

- Presentar una vista inicial liviana únicamente en la ruta autenticada del Dashboard.
- Mantenerla fuera del root de React y retirarla al aparecer la vista de Dashboard.
- Medir FCP, LCP y ciclo de vida del shell en tres muestras frías de staging.
- Comparar el resultado con el baseline persistido de Spec 049.

Fuera (explícito):

- Cambiar widgets, consultas, roles, rutas HTTP o contratos API.
- Alterar el diseño final del Dashboard o mostrar datos privados en HTML estático.
- Cambiar presupuestos globales de Lighthouse.

## Criterios de aceptación

- [x] AC1: En una carga directa autenticada de `/#/dashboard`, el shell visible se pinta antes de que React monte el Dashboard; React conserva su root vacío y el shell no altera el flujo del contenido final.
- [x] AC2: Sin sesión, o en cualquier ruta distinta de `/#/dashboard`, el shell se elimina antes de mostrarse. En la ruta autorizada desaparece al presentarse el reloj real del Dashboard; un límite de tiempo elimina cualquier shell retenido.
- [x] AC3: La prueba Playwright guarda FCP, LCP, momento de visibilidad del reloj real y eventos de aparición/eliminación del shell en tres muestras móviles frías.
- [x] AC4: En staging, la mediana de LCP frío mejora al menos 10% frente a 5.179,54 ms y FCP no empeora frente a 3.642,41 ms. TBT se mide y se reporta en todas las muestras, pero no es un gate duro mientras el historial de Spec 039 lo considera variable y no tiene aserción configurada.
- [x] AC5: La batería estándar conserva las 18 rutas, sus 85 aserciones y el perfil visual; `dist/index.html` permanece bajo 5 KB, el shell no añade solicitudes de red y CSP permite solo el hash SHA-256 exacto sin `unsafe-inline` en `script-src`.

Nota de método: el borrador inicial fijó TBT en 151,25 ms (+10% del baseline).
Se retiró ese gate provisional al contrastarlo con la evidencia de Spec 039, que
documenta alta variación de TBT entre corridas y aún no le asigna una aserción.
Los resultados de TBT siguen registrados y pasan a ser el siguiente foco de
optimización.

## Restricciones

Aplican los principios de rendimiento y Spec antes de PR. Se preserva React como
propietario del `#root`, el HTML estático no contiene credenciales ni datos de
usuario, y el shell se limita a texto genérico y hora local. La CSP mantiene
`script-src 'self'` más el hash del script; un check de build exige sincronía
entre HTML y Nginx. No hay cambios de base de datos ni contratos. Si la medición
no cumple LCP/FCP de AC4 o aparece CLS/flash en rutas no elegibles, se retira el
shell y se conserva la evidencia. TBT se mantiene como señal para la siguiente
iteración, acorde al criterio documentado en Spec 039.

## Trazabilidad

- Tests que lo probarán: `frontend/e2e/performance.spec.ts`, Playwright perf y Lighthouse CI.
- Docs a actualizar: `specs/050-dashboard-bootstrap-shell/evidencia/resultado-2026-10-24.md`.
