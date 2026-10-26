# Spec 076: shell temprano para Worker Portal

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

En el build de staging medido por Spec 075, Worker Portal tuvo LCP Lighthouse
frío mediano de 5.055 ms. La auditoría de elemento identifica el reloj del
portal como LCP y estima 4.755 ms de render delay bajo red móvil simulada
(150 ms RTT, 1.638 Kbps y CPU 4×). La vista que contiene el reloj está protegida
contra edición; el `index.html` ya tiene un shell estático para Dashboard que
se entrega antes de React.

## Alcance

Dentro:

- Reutilizar el único shell estático de `index.html` para las cargas directas
  autenticadas de Dashboard y Worker Portal.
- Mostrar una cabecera y hora local provisoria antes de React en Worker Portal;
  conservar el root oculto hasta que la hoja de estilos esté disponible.
- Retirar el shell solo cuando el reloj real de la ruta esté montado y el CSS
  esté listo, con el timeout de recuperación existente.
- Medir tres sesiones frías de Worker Portal y comparar LCP, TBT, bytes y tiempo
  hasta el reloj real con el mismo perfil de Lighthouse.

Fuera (explícito):

- Editar `WorkerPortal.view.tsx`, cambiar el reloj de negocio, sus fuentes de
  datos o el flujo de autenticación.
- Cambiar el contenido funcional del portal, contratos HTTP, API o backend.
- Afirmar que el shell acelera la interactividad si solo mejora el primer
  contenido; se registrará por separado cuándo aparece el reloj real.

## Criterios de aceptación

- [x] AC1: Una sesión autenticada que navega directamente a `#/worker-portal`
      muestra el shell del portal antes de que React agregue hijos al root; el
      shell muestra contenido significativo y no datos del usuario.
- [x] AC2: El shell permanece hasta que la hoja de estilos y
      `[data-testid="server-clock"]` estén listos, luego desaparece; la ruta
      Dashboard conserva el comportamiento actual y el timeout revela la app.
- [x] AC3: Sin sesión, o al navegar desde el shell a otra ruta, el shell no
      oculta Login ni deja la aplicación bloqueada; pruebas Playwright verifican
      estos casos en Chromium.
- [x] AC4: Tres muestras frías de Worker Portal con viewport 412×823 y CPU 4×
      capturan shell, candidato LCP y aparición del reloj real; el shell es el
      candidato LCP previo al reloj real en las tres muestras.
- [x] AC5: Tres corridas Lighthouse frías comparables reducen al menos 30% la
      mediana LCP frente a 5.054,56 ms y conservan el HTML de producción en
      ≤5.120 bytes. Se reporta el cambio bruto de TBT y se compara el cambio de
      Worker Portal contra Dashboard frío, control del mismo ciclo; la regresión
      diferencial no supera 50 ms.
- [x] AC6: La evidencia identifica imagen, commit, estado del árbol y límites;
      `spec:check`, `docs:check`, preflight, pruebas focalizadas y
      `git diff --check` pasan.

## Restricciones

- No modificar la vista protegida ni iniciar solicitudes mutantes.
- Reutilizar el estilo y el único nodo del shell para respetar el límite de
  tamaño de `dist/index.html`; no duplicar CSS crítico.
- Reconstruir únicamente el frontend de staging. No tocar backend, base de
  datos ni volúmenes.
- Si el shell no precede al contenido real, empeora la disponibilidad visual o
  no alcanza la mejora Lighthouse, revertirlo y conservar los registros.

## Trazabilidad

- Baseline: [resultado Spec 075](../075-lazy-worker-portal-correction-modal/evidencia/resultado-2026-10-24.md) y
  [run de staging](../039-frontend-performance-battery/evidencia/runs/2026-10-24T17-57-24-073Z-ee638e54.json).
- Tests: `frontend/e2e/performance.spec.ts`.
- Evidencia final: `./evidencia/resultado-2026-10-24.md` y un nuevo registro en
  la batería de Spec 039.
