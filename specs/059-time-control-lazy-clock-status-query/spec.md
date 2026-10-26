# Spec 059: Time Control Lazy Clock Status Query

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

En tres sesiones frías de Time Control se observaron tres llamadas `GET /api/records` por sesión, con duración observada entre 75 y 137 ms por llamada (Spec 058). El código confirma que `useClockingPanel` consulta los últimos cinco registros sin un empleado seleccionado, y el efecto que consume la respuesta la ignora mientras no haya selección (`frontend/src/features/time-control/hooks/useClockingPanel.ts`).

La solicitud añade tráfico al arranque de la ruta sin aportar estado visible. Se eliminará solo esa consulta inicial; la carga de registros filtrados y el estado del empleado seleccionado deben conservarse.

## Alcance

Dentro:

- Evitar la consulta de estado de marcaje cuando no hay un empleado seleccionado.
- Activar la consulta específica del empleado al seleccionarlo.
- Añadir una aserción al probe frío de staging y evidencia con dimensiones de query anonimizadas.

Fuera (explícito):

- Cambiar el overlay de sincronización, el orden de `runSync` o las consultas que alimentan la tabla y sus filtros.
- Registrar nombres, IDs, fechas, query strings completos o cuerpos de solicitudes/respuestas.
- Cambiar API, contratos, SDK, base de datos o datos de staging.

## Criterios de aceptación

- [x] AC1: Sin empleado seleccionado, `useClockingPanel` entrega `enabled: false` a `useTimeRecords`; al seleccionar uno, habilita la consulta con ese `employeeId`.
- [x] AC2: El probe E2E confirma que una entrada fría a Time Control no envía la consulta de `pageSize=5` sin filtro de empleado, y que la consulta reaparece al habilitarla por selección en la prueba unitaria.
- [x] AC3: En tres contextos fríos de staging se observan dos llamadas `/api/records` por ruta en vez de las tres de la línea base, mientras el overlay conserva cobertura e hit-test y las consultas existentes de tabla y filtros siguen presentes. El registro conserva solo `pageSize` y booleanos de presencia de filtros; omite valores sensibles y bodies.
- [x] AC4: Typecheck, lint, formato, `spec:check`, `docs:check` y preflight pasan.

## Restricciones

Mantener TanStack Query como propietario de datos remotos y usar su puerta `enabled` existente. No hay cambios de contrato ni migraciones. El rollback consiste en retirar la condición `enabled` y su aserción de regresión.

## Trazabilidad

- Tests que lo probarán: `frontend/src/tests/components/time_control/ClockingPanel.spec.tsx` y el probe de sync frío en `frontend/e2e/performance.spec.ts`.
- Docs a actualizar: resultado y muestra de staging bajo `evidencia/`; `.jules/bolt.md`.
