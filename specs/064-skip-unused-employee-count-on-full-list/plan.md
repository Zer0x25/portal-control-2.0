# Plan 064: Skip Unused Employee Count On Full List

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

Cómo se implementa en 3-6 pasos. Sin código, solo decisiones técnicas.

1. Ampliar el probe de rendimiento para conservar únicamente los bytes de `/api/employees` y capturar el baseline con tres contextos fríos en staging.
2. Añadir pruebas de servicio que comprueben que la lista completa no cuenta y la paginada sí.
3. Ejecutar `findMany` directamente en el caso no paginado y derivar `total` desde las filas; mantener el camino paginado actual.
4. Correr pruebas enfocadas, checks backend, spec checks y preflight.
5. Reconstruir backend staging, revisar salud y repetir el mismo probe; registrar límites de la comparación y concluir si la ganancia es medible.

## Archivos a tocar

| Archivo                                                        | Cambio                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| `backend/src/services/EmployeeService.ts`                      | Evitar `employee.count` en listas completas.                 |
| `backend/tests/unit/employeeServiceList.test.ts`               | Cubrir uso de count según paginación.                        |
| `frontend/e2e/performance.spec.ts`                             | Capturar longitud de `/api/employees` sin persistir el body. |
| `specs/064-skip-unused-employee-count-on-full-list/evidencia/` | Conservar muestras baseline y final.                         |
| `.jules/bolt.md`                                               | Anotar el resultado medido y siguiente oportunidad.          |

## Contratos afectados

Ninguno. La ruta y el payload actual no cambian.

## Riesgos y rollback

Una rama incorrecta podría omitir el total paginado; las pruebas cubren ambas
modalidades. Rollback: restaurar el conteo paralelo en `listEmployees`.

## Verificación

`npm --prefix backend exec vitest run tests/unit/employeeServicePin.anti-regression.test.ts`
y `npm --prefix backend run check`; `npm run spec:check`, `npm run docs:check`,
`npm run preflight`; probe Playwright dirigido en staging antes y después.
