# Spec 065: Time Control Active Employee Query

- Estado: Descartado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

En el staging de Spec 064, el arranque de Control de Asistencia recibió una
lista de empleados de 75.926 bytes. Como sus consumidores usan empleados activos,
se evaluó filtrar `status=Activo`, parámetro que ya admite la ruta actual. El
experimento debía demostrar al menos 25% menos payload antes de cambiar el cliente.

## Alcance

Dentro:

- Medir el tamaño de la respuesta completa y de `status=Activo` en tres contextos fríos.
- Adoptar el filtro solo si reduce al menos 25% el payload.

Fuera (explícito):

- Cambiar el comportamiento de la aplicación cuando no se alcanza el umbral.

## Criterios de aceptación

Criterios de aceptación verificables, uno por línea, estilo Given/When/Then
o checklist medible:

- [x] AC1: El baseline registra solo tamaños y dimensiones seguras para lista completa y `status=Activo` en tres contextos.
- [x] AC2: Si el filtro no reduce al menos 25%, la propuesta se descarta sin cambiar el comportamiento de la aplicación.

## Restricciones

No hay cambio de aplicación, contrato, ni migración. El resultado solo aplica a
los datos observados en staging el 2026-10-24.

## Trazabilidad

- Tests que lo probarán: `frontend/e2e/performance.spec.ts` con `PERFORMANCE_ACTIVE_EMPLOYEE_FILTER_PROBE=1`.
- Docs a actualizar: evidencia de la decisión y `.jules/bolt.md`.
