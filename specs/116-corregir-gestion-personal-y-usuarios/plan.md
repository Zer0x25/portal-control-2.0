# Plan de Implementación — Spec 116 (`gestion-personal-y-usuarios`)

## 1. Estrategia

Ejecutar las correcciones en paralelo mediante `/swarm` dividiendo estrictamente backend (`pu-backend`) y frontend (`pu-frontend`) en workspaces `share` (o secuencia limpia con sincronización OpenAPI/SDK al final antes de verificar), seguidos de un verificador (`pu-verifier`) en staging y pruebas completas.

## 2. Componentes a modificar

### Backend

- `backend/src/models/schemas/employee.schemas.ts`: agregar `area`, `workdayType`, `EmployeeQuerySchema` con `positiveIntString` y tope máximo de `pageSize`.
- `backend/src/models/schemas/auth-user.schemas.ts`: `UpdateUserSchema` con `employeeId.nullable().optional()`, rol `"Archivado"`, validación no-vacía en `username`; `UserQuerySchema` con `positiveIntString` y tope máximo de `pageSize`.
- `backend/src/modules/employees/application/flows.ts` y `backend/src/services/EmployeeService.ts` / `employeeFlows.ts`:
  - Normalizar dígitos de RUT para derivación/validación de PIN inicial con bcrypt.
  - Hacer atómico `resolveEmployeeId` dentro de `withDirectTransaction`.
  - Unificar `repository.update`, `ensureUser` y `syncEmployeeStatus` bajo la misma `withDirectTransaction`; envolver `createBulkEmployees` en transacción.
  - Incluir `syncStatus`, `lastModified`, `isDeleted` en respuesta de `POST /api/employees`.
  - Alinear `GET /api/employees` con `clocking-options` para `Usuario` (`employeeId: null` -> `[]`) y `Supervisor` (por `area`).
- `backend/src/modules/users/http/routes.ts`, `application/flows.ts` y `backend/src/services/UserService.ts`:
  - Permitir `Supervisor_Elevado` en `POST`/`PUT`/`DELETE /api/users` con guard estricto de jerarquía (`ROLE_HIERARCHY`, prohibido crear/modificar/eliminar `Administrador` o asignar rol `Administrador`).
  - Rechazar `DELETE /api/users/:id` cuando `params.id === authUser.id`.
  - Soportar `employeeId: null` para desvincular.
- Tests backend: `tests/unit/employeeFlows.test.ts`, `tests/unit/employeeServicePin.anti-regression.test.ts`, `tests/unit/employeeServiceList.test.ts`, `tests/unit/userFlows.test.ts`, `tests/fastify-integration/employees.test.ts`, `tests/fastify-integration/users.test.ts`.

### Frontend

- `frontend/src/features/user-management/views/UserManagement.view.tsx` y `hooks/useUserManagementData.ts`:
  - Mostrar botón `"Nuevo Usuario"` también en modo embebido cuando `canCreateUsers` (`Administrador` o `Supervisor_Elevado`).
  - Actualizar `canManageUser` para permitir a `Supervisor_Elevado` gestionar usuarios no-`Administrador`.
  - Corregir manejo de errores y retornos booleanos en `handleSaveUser`, `handleConfirmDeleteUser`, `handleConfirmResetPassword` (sin cierres ni toasts falsos positivos).
- `frontend/src/schemas/forms/user.ts`, `frontend/src/features/user-management/hooks/useUserFormController.ts` y `components/UserForm.view.tsx`:
  - Permitir alta con contraseña temporal por defecto (`"123456"`) sin requerir input visible.
  - Enviar `employeeId: null` explícito al seleccionar `"-- SIN ASIGNAR --"` en edición.
- `frontend/src/hooks/useUsers.ts`: mostrar `addToast` de error y propagar `null`/`false` consistentemente.
- `frontend/src/features/employee-management/views/EmployeeManagement.view.tsx` y `hooks/useEmployeeManagementData.ts`:
  - Calcular `hasLinkedUser` real desde la lista de `users`.
  - Pasar la lista completa de empleados (`allEmployees` sin filtro/paginación) como `existingEmployees` a `EmployeeForm`.
  - Esperar `handleConfirmArchive` antes de cerrar modal y resolver `handleReactivate` desde la lista completa.
- `frontend/src/hooks/useEmployees.ts`: eliminar `hardDeleteUser` y `recreateUser` redundantes en `archiveEmployee` y `reactivateEmployee`, invalidando queries de `employees` y `users`.
- Tests frontend: `employeeAndUserForms.test.tsx`, `UserManagementView.test.tsx`, `useUserManagementData.test.ts`, `EmployeeManagementView.test.tsx`, `useEmployeeManagementData.test.tsx`.

### Contratos y Documentación

- Ejecutar `npm run docs:openapi:generate` y regenerar SDK frontend (`api-contracts-sync`).
- Actualizar `docs/flows/gestion-personal-y-usuarios.md` y `docs/flows/_index.md` a `SINCRONIZADO_Y_VERIFICADO`.
