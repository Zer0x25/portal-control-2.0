# Spec 064: Skip Unused Employee Count On Full List

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

El arranque de Control de Asistencia espera el listado completo de empleados.
En staging, esa fase tuvo mediana de 201,6 ms y `/api/employees` tardó 148–275 ms
en el browser. `EmployeeService.listEmployees` ejecuta `employee.count` incluso
sin `page/pageSize`, aunque `createEmployeeFlows.list` devuelve un arreglo y
descarta `total` en ese caso. El conteo agrega trabajo de base de datos sin
aportar datos al contrato de la lista completa.

## Alcance

Dentro:

- Omitir `employee.count` cuando la consulta no solicita paginación.
- Conservar el total exacto derivado de la lista completa para el contrato interno.
- Capturar tamaño de respuesta y tiempos en staging antes y después.

Fuera (explícito):

- Modificar el payload HTTP, sus filtros o la semántica de paginación.
- Cambiar la consulta del frontend o el tamaño/campos de la lista.

## Criterios de aceptación

Criterios de aceptación verificables, uno por línea, estilo Given/When/Then
o checklist medible:

- [x] AC1: La lista sin `page/pageSize` obtiene empleados con una consulta y no llama `employee.count`.
- [x] AC2: La lista paginada conserva `employee.count`, filas, total y metadatos de paginación.
- [x] AC3: La prueba de staging registra bytes de `/api/employees` sin guardar cuerpos ni PII y compara tres contextos fríos antes/después.
- [x] AC4: Las validaciones del backend y el preflight pasan; el staging reconstruido queda saludable.

## Restricciones

Sin migraciones ni cambios de contrato HTTP/SDK. La reversión consiste en restaurar
la llamada paralela a `employee.count`; la paginación permanece intacta.

## Trazabilidad

- Tests que lo probarán: `backend/tests/unit/employeeServiceList.test.ts`, `backend/tests/fastify-integration/employees.test.ts` y `frontend/e2e/performance.spec.ts`.
- Docs a actualizar: evidencia baseline/final de esta spec y `.jules/bolt.md`.
