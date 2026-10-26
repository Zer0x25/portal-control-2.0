# Plan 066: Time Control Employee Clock Options

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

Cómo se implementa en 3-6 pasos. Sin código, solo decisiones técnicas.

1. Medir en staging el tamaño actual y el JSON serializado con los seis campos, sin guardar cuerpos; continuar solo si reduce ≥50%.
2. Añadir el DTO y la consulta Fastify con selección de campos, filtro `Activo`, auth y alcance de fila por rol.
3. Añadir la ruta y su operación OpenAPI; ejecutar el runbook `api-contracts-sync` para generar Swagger y SDK.
4. Crear query/cache liviana y usarla en componentes, `useScheduling`, encabezado y automatización mientras esté activa la ruta Time Control; conservar el listado normal en las demás rutas.
5. Añadir cobertura de payload/roles/query, correr preflight, reconstruir staging y repetir la prueba de tres contextos.

## Archivos a tocar

| Archivo                                                                                                                         | Cambio                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `backend/src/models/schemas/employee.schemas.ts`                                                                                | Definir schema del DTO liviano.                                                                         |
| `backend/src/platform/openapi/operations.ts`                                                                                    | Registrar GET `/api/employees/clocking-options`.                                                        |
| `backend/src/modules/employees/application/contracts.ts`                                                                        | Definir proyección y dependencia del flujo.                                                             |
| `backend/src/modules/employees/application/flows.ts`                                                                            | Exponer el flujo de opciones de marcación.                                                              |
| `backend/src/services/EmployeeService.ts`                                                                                       | Seleccionar solo campos necesarios y filtrar activos con scope de usuario.                              |
| `backend/src/modules/employees/http/routes.ts`                                                                                  | Añadir endpoint autenticado.                                                                            |
| `frontend/src/services/employeeService.ts`                                                                                      | Llamar endpoint generado por SDK.                                                                       |
| `frontend/src/hooks/queries/useEmployeesQuery.ts`                                                                               | Query/caché de opciones livianas.                                                                       |
| `frontend/src/hooks/layout/`, `frontend/src/hooks/useLoginAutomations.ts` y `frontend/src/hooks/useScheduling.ts`               | Evitar la lista completa solo en Time Control, incluida la sincronización de horarios y el auto-inicio. |
| `frontend/src/components/layout/AutoStartShiftAutomation.tsx` y `frontend/src/components/layout/PersistentLayout.container.tsx` | Elegir la proyección según la ruta activa.                                                              |
| `frontend/src/features/time-control/`                                                                                           | Consumir el DTO tipado.                                                                                 |
| `frontend/src/tests/` y `frontend/e2e/performance.spec.ts`                                                                      | Cubrir scoping, compatibilidad y bytes.                                                                 |

## Contratos afectados

Nueva ruta GET; se deben generar `backend/docs/swagger.json` y `frontend/src/types/api-schema.ts`.

## Riesgos y rollback

No invalidar la clave de colección al mutar empleados podría dejar opciones
obsoletas; mantener ambas bajo raíz común. Ruta nueva solo se consume en Time
Control. Rollback: volver esos consumidores a `useEmployees()` y retirar el GET.

## Verificación

Runbook `.agents/skills/api-contracts-sync/SKILL.md`; test integración `employees.test.ts`, tests frontend afectados, `npm run preflight` y probe Playwright dirigido de staging.
