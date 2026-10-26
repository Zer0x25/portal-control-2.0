# Spec 057: Time Control Sync Overlay LCP

- Estado: Cerrada sin adopción (AC3 no alcanzado)
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

En el staging reconstruido, tres perfiles fríos de Control horario registraron el texto del `InitialSyncOverlay` como candidato LCP entre 1.560 y 1.784 ms. El mismo overlay entra con un fade de 800 ms y el texto de estado pulsa; el último lote dio LCP observado mediano de 1.592 ms. El overlay debe seguir cubriendo la app hasta terminar la sincronización, pero sus animaciones de entrada podrían estar retrasando el primer estado visible.

## Alcance

Dentro:

- Quitar el fade de entrada del contenedor de sincronización y los pulsos decorativos del overlay; conservar el spinner giratorio y la barra de progreso.
- Añadir un probe Playwright que registre tres arranques limpios, el candidato LCP, el estilo animado del texto y el hit-test que confirma que el overlay sigue bloqueando la app durante sync.
- Reconstruir staging y repetir Lighthouse frío de Control horario con el mismo viewport, navegador y throttle.

Fuera (explícito):

- Quitar el overlay, dejar interactuar con la app antes de completar la sincronización o alterar el estado/flujo de sync.
- Cambiar el contenido, estilos de otras rutas, contratos HTTP, datos de staging o límites Lighthouse.
- Afirmar una mejora si el cambio no reduce de forma repetible el LCP observado.

## Criterios de aceptación

- [x] AC1: El probe en tres contextos nuevos registra el overlay, sus estilos calculados, FCP/LCP y el elemento candidato; confirma que el `lastSyncTime` era nulo al inicio.
- [x] AC2: Durante `isInitialSync`, el overlay sigue ocupando la pantalla y gana el hit-test sobre la ruta; desaparece al terminar la sync. Los dos spinners y el progreso siguen visibles.
- [ ] AC3 (no cumplido): Solo se conserva el cambio visual si, tras rebuild, el LCP observado mediano baja al menos 100 ms frente al baseline de 1.592 ms, y las medianas de FCP y TBT no empeoran más de 100 ms. LCP bajó 43 ms; por la regla de rollback, se restauraron las clases originales.
- [x] AC4: La batería completa de staging pasó en el rebuild experimental: 18 rutas readiness (tres muestras por ruta), 17 rutas Lighthouse y 85/85 aserciones. No se alteraron API ni datos.
- [x] AC5: Typecheck, lint de frontend, preflight, checks de specs/documentación y formato pasan.

## Restricciones

- El overlay global debe permanecer opaco, full-screen y sobre la app hasta el final de sincronización; no cambiar `syncSlice` ni `isInitialSync`.
- Mantener la primitiva compartida `LoadingSpinner`; no introducir spinners ni dependencias nuevas.
- Si AC3 no se cumple, restaurar las clases originales y dejar evidencia de que el experimento no mejoró la métrica.

## Trazabilidad

- Tests: `frontend/e2e/performance.spec.ts` y el probe frío de Lighthouse de `npm run perf:staging`.
- Código: `frontend/src/components/ui/InitialSyncOverlay.tsx`.
- Evidencia: `./evidencia/resultado-2026-10-24.md` y el registro versionado en Spec 039.

## Resolución

La comparación no cumplió el umbral mínimo de LCP. Se restauraron el fade de 800 ms y los pulsos decorativos; el probe de bloqueo y estilos queda para futuras mediciones. El resultado completo está en [`evidencia/resultado-2026-10-24.md`](./evidencia/resultado-2026-10-24.md).
