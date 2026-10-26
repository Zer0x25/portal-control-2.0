# Spec 066: Time Control Employee Clock Options

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

El payload completo de `/api/employees` mide 75.926 bytes en staging. Los
consumidores de Control de Asistencia usan `id`, `name`, `area` y
`workdayType`; la automatización global también necesita `position`. El listado
general transfiere además RUT, correo, metadatos de sync y estado PIN. Filtrar empleados activos no reduce el payload
en el staging actual, así que se necesita medir una proyección de campos.

## Alcance

Dentro:

- Medir el tamaño de una proyección de `id`, `name`, `position`, `area`, `workdayType` y `status` sobre la respuesta actual.
- Si la proyección reduce al menos 50%, agregar una lectura Fastify autenticada que devuelva únicamente esos campos para empleados activos.
- Usar la consulta liviana para Control de Asistencia, bienvenida y automatización global solo mientras esa ruta esté activa.
- Mantener el listado completo en otras rutas y respetar el alcance por `employeeId` del rol `Usuario`.

Fuera (explícito):

- Modificar el payload o los datos que recibe administración, reportes u otras rutas.
- Exponer la lista liviana sin autenticación o relajar la visibilidad por rol.
- Agregar migraciones o cambiar filtros/formatos de la lista completa.

## Criterios de aceptación

Criterios de aceptación verificables, uno por línea, estilo Given/When/Then
o checklist medible:

- [x] AC1: La proyección medida en tres contextos es al menos 50% menor que los 75.926 bytes del listado completo; si no, descartar la implementación.
- [x] AC2: El nuevo endpoint requiere auth, devuelve solo `id`, `name`, `position`, `area`, `workdayType`, `status`, filtra activos, limita `Usuario` a su empleado y mantiene el filtro de área de `Supervisor`.
- [x] AC3: Control de Asistencia usa el endpoint liviano sin GET a la lista completa; en rutas restantes archivados y funciones existentes siguen disponibles.
- [x] AC4: Swagger, SDK, tests y preflight quedan sincronizados; el probe final conserva bytes sin cuerpos y staging queda saludable sin aumentar solicitudes de arranque.

## Restricciones

No hay migraciones. El endpoint nuevo tiene un DTO específico y la raíz de
query `employees` permite invalidación junto con la colección completa. El GET
completo no cambia. La ruta nueva replica autenticación y scoping del listado.

## Trazabilidad

- Tests que lo probarán: `backend/tests/fastify-integration/employees.test.ts`, tests de queries/hooks de frontend y `frontend/e2e/performance.spec.ts`.
- Docs a actualizar: OpenAPI/SDK generados, evidencia baseline/final y `.jules/bolt.md`.
