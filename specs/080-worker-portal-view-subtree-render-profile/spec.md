# Spec 080: perfilar subárbol de vista del Worker Portal

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

El perfil React de Spec 074 midió 146,7 ms de `actualDuration` en el scope
completo `worker-portal`, pero no separó el componente container y sus hooks del
subárbol visual. Spec 079 encontró trabajo repetido en reconciliación de React
DOM, pero todavía no permite vincularlo a un componente concreto de la ruta.
La vista `WorkerPortal.view.tsx` está protegida para edición, así que el límite
de medición debe agregarse en el container sin tocar esa vista.

## Alcance

Dentro:

- Añadir un scope React Profiler de desarrollo alrededor de `WorkerPortalView`
  dentro del container.
- Ejecutar el perfil React existente para Worker Portal, viewport móvil, CPU 4×
  y tres contextos fríos contra el staging local.
- Guardar métricas de ruta y subárbol con sus límites de atribución explícitos.

Fuera (explícito):

- Editar `WorkerPortal.view.tsx`, cambiar consultas/datos/API o modificar el
  comportamiento visual.
- Reconstruir/reiniciar staging o declarar una mejora de producción/CWV a partir
  del profiler Vite dev.
- Desplegar source maps, perf instrumentation o cambios de producto en staging.

## Criterios de aceptación

- [x] AC1: El container crea un scope `worker-portal:view` usando el helper
      `RenderProfiler`; en builds de producción el helper retorna los children
      sin añadir el boundary.
- [x] AC2: Tres perfiles fríos en Chromium 153, 412×823, CPU 4× miden el scope
      `worker-portal:view` y el scope padre `worker-portal`; ambos tienen eventos
      completos y `commitEventsDropped` en cero.
- [x] AC3: El runner solo autentica y navega, sin acciones de negocio; los
      servicios/image ID de staging permanecen intactos. Los errores WebSocket
      del proxy Vite, si aparecen, quedan registrados como límite.
- [x] AC4: La evidencia distingue el tiempo de la vista del tiempo total de la
      ruta sin sumar scopes anidados ni equiparar Vite dev con producción.
- [x] AC5: Test de profiler dirigido, frontend check/lint, `spec:check`,
      `docs:check`, lint budget y preflight pasan antes del commit local.

## Restricciones

- La métrica `actualDuration` corresponde al profiler React en Vite dev y sirve
  solo para atribución del subárbol.
- No inferir duración del container restando scopes anidados o commits con
  límites de ventana distintos.
- El endpoint usado por Vite dev apunta explícitamente al staging local en
  `127.0.0.1:8080`; toda configuración temporal se elimina tras la medición.

## Trazabilidad

- Baseline: [Spec 074](../074-worker-portal-cold-load-attribution/evidencia/worker-portal-render-profile-2026-10-24.json).
- Perfil de producción: [Spec 079](../079-worker-portal-noapp-cpu-stack-attribution/evidencia/resultado-2026-10-24.md).
- Evidencia nueva: `./evidencia/resultado-2026-10-24.md` y
  `./evidencia/worker-portal-view-render-profile-2026-10-24.json`.
