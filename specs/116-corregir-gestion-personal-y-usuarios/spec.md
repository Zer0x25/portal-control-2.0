# Spec 116: Corregir flujo de gestión de personal y usuarios (`gestion-personal-y-usuarios`)

- **Estado:** `APROBADA` (dudas `DUDA-01..03` resueltas por el usuario: `1.A`, `2.B`, `3.A`).
- **Fecha:** 2026-11-18
- **Flujo asociado:** [gestion-personal-y-usuarios.md](file:///docs/flows/gestion-personal-y-usuarios.md)

## 1. Contexto y alcance

Durante la replicación controlada (Fase 2) en Fastify + PostgreSQL 18.4 y Playwright headless sobre staging (`#/personnel-management`), se confirmaron `7` bugs técnicos y `3` decisiones de negocio abiertas en el ciclo de vida de empleados y usuarios (`/api/employees*`, `/api/users*`, `PersonnelManagement`, `EmployeeManagement`, `UserManagement`).

## 2. Decisiones funcionales resueltas

- **DUDA-01 (`1.A`):** Al archivar o reactivar un empleado, el frontend delega la gestión del `User` vinculado exclusivamente al backend (`PUT /api/employees/:id`), eliminando las llamadas redundantes a `DELETE /api/users/:id` y `POST /api/users` desde `useEmployees.ts`. El backend conserva al usuario con `role: "Archivado"` (revocando sus sesiones) y lo restaura a `"Usuario"` con contraseña temporal `"123456"` e `isForcePasswordChange: true` al reactivar.
- **DUDA-02 (`2.B`):** `Supervisor_Elevado` queda habilitado para crear, editar y eliminar usuarios tanto en UI como en API (`/api/users*`), sujeto a jerarquía estricta: nunca puede crear, modificar, resetear ni eliminar cuentas de rol `"Administrador"`, ni asignar el rol `"Administrador"` a ningún usuario.
- **DUDA-03 (`3.A`):** `GET /api/employees` se alinea con `GET /api/employees/clocking-options`: si el usuario autenticado tiene rol `"Usuario"` y `employeeId === null`, devuelve `[]`; si tiene rol `"Supervisor"`, filtra por el `area` de su empleado vinculado (o devuelve `[]` si no tiene empleado/área). `Administrador`, `Supervisor_Elevado` y `Reloj_Control` mantienen visibilidad completa.

## 3. Requisitos funcionales y técnicos

### RF-01: Habilitar alta y gestión de usuarios en `#/personnel-management?tab=users` (BUG-01, DUDA-02)

- `UserManagement.view.tsx` debe renderizar el botón `"Nuevo Usuario"` también cuando `isEmbedded === true` si el usuario actual tiene permiso de gestión (`Administrador` o `Supervisor_Elevado`), en barra de herramientas desktop y acceso móvil.
- `buildUserFormSchema` (`frontend/src/schemas/forms/user.ts`) y `useUserFormController` deben permitir el alta sin input visible de contraseña usando `DEFAULT_TEMPORARY_PASSWORD` (`"123456"`), manteniendo la tarjeta informativa `"Contraseña Temporal: 123456 * Cambio Obligatorio"`.
- `useUserManagementData.canManageUser` debe permitir a `Supervisor_Elevado` gestionar usuarios cuyo rol sea distinto de `"Administrador"` (nivel jerárquico `<= 4`), bloqueando la gestión de `"Administrador"` en UI y manteniendo solo `Administrador` sobre todos los roles.

### RF-02: Corrección de formulario y ciclo de vida de empleados en frontend (BUG-02, DUDA-01)

- `EmployeeManagement.view.tsx` debe calcular `hasLinkedUser` dinámicamente buscando en `users` por `employeeId` en lugar de pasar `false` fijo.
- La validación de RUT duplicado (`existingEmployees`) debe evaluarse contra el conjunto completo de empleados (`active + archived` sin filtro ni paginación).
- `useEmployees.archiveEmployee` y `reactivateEmployee` deben delegar la transición del `User` vinculado y asignaciones al backend (`PUT /api/employees/:id`), invalidando las queries de `employees` y `users` sin ejecutar `DELETE /api/users/:id` ni `POST /api/users`.
- `handleConfirmArchive` en `EmployeeManagement.view.tsx` debe esperar el resultado asíncrono antes de cerrar el modal, y `handleReactivate` debe resolver el empleado desde `archivedListStore` / `employees`.

### RF-03: Desvinculación de `employeeId` y manejo de errores en usuarios (BUG-03)

- En `UserForm`, seleccionar `"-- SIN ASIGNAR --"` debe enviar `employeeId: null` (o `""` manejado explícitamente en `onSubmit`) en `PUT /api/users/:id` para desvincular al empleado existente.
- `UpdateUserSchema` (`backend/src/models/schemas/auth-user.schemas.ts`) debe aceptar `employeeId: z.string().nullable().optional()` y el rol `"Archivado"` cuando corresponda.
- `useUsers.ts` y `useUserManagementData.ts` deben propagar/notificar errores reales con `addToast`, no cerrar el modal ni mostrar toast de éxito cuando `addUser` o `updateUser` fallen.

### RF-04: Contratos OpenAPI/Zod, paginación y RBAC en API (BUG-04, BUG-05, DUDA-02, DUDA-03)

- `EmployeeSchema` (`backend/src/models/schemas/employee.schemas.ts`) debe incluir `area` y `workdayType` como obligatorios y reflejar los campos reales devueltos por `POST /api/employees` (`syncStatus`, `lastModified`, `isDeleted`).
- `UserQuerySchema` (`backend/src/models/schemas/auth-user.schemas.ts`) y `EmployeeQuerySchema` deben usar `positiveIntString` para `page` y `pageSize`, con un tope máximo explícito en `pageSize` (ej. `<= 200`, o configurable con techo seguro) devolviendo `400 VALIDATION_ERROR` ante valores inválidos como `0`, `-1` o `"abc"`.
- `/api/users*`: habilitar `POST /api/users`, `PUT /api/users/:id` y `DELETE /api/users/:id` para `Administrador` y `Supervisor_Elevado`, aplicando validación de jerarquía en backend para impedir que `Supervisor_Elevado` cree, edite, resetee o elimine usuarios `"Administrador"` o escale roles a `"Administrador"`.
- `GET /api/employees`: implementar filtrado consistente con `clocking-options` para `Usuario` (`employeeId === null` -> `[]`) y `Supervisor` (por `area` del empleado vinculado).
- Sincronizar `swagger.json` y el SDK TypeScript del frontend (`npm run check:sdk`).

### RF-05: Seguridad, concurrencia y atomicidad en `EmployeeService` y `UserService` (BUG-06, BUG-07)

- Normalizar el RUT (eliminar puntos/guiones, tomar solo dígitos) antes de derivar el PIN inicial de 4 dígitos, garantizando que siempre cumpla `/^\d{4}$/` y se almacene hasheado con `bcryptjs` (nunca en texto plano), incluyendo el chequeo de PIN igual a primeros 4 dígitos del RUT en `updateEmployee`.
- Hacer atómica la generación de IDs `EMP-N` (`resolveEmployeeId`) dentro de `withDirectTransaction` (ordenamiento numérico real o lock/secuencia) para evitar colisiones `409` en `POST /api/employees` concurrentes.
- Integrar `ensureUser` y `syncEmployeeStatus` dentro de la misma `withDirectTransaction` de `EmployeeFlows.update`, y envolver `createBulkEmployees` en transacción.
- Bloquear en `DELETE /api/users/:id` que un usuario (`Administrador` o `Supervisor_Elevado`) elimine su propia cuenta (`400` / `403` / `409`).

## 4. Criterios de aceptación

1. En `#/personnel-management?tab=users`, tanto `Administrador` como `Supervisor_Elevado` ven el botón `"Nuevo Usuario"`, pueden crear usuarios con contraseña temporal `"123456"` sin bloqueo Zod, y `Supervisor_Elevado` solo ve acciones de escritura sobre usuarios no-`Administrador`.
2. Archivar y reactivar un empleado con usuario vinculado ejecuta solo `PUT /api/employees/:id`, preservando el usuario en estado `"Archivado"` y restaurándolo al reactivar sin duplicados ni `409`.
3. Desvincular `employeeId` en `UserForm` envía `null`, persiste en PostgreSQL y sobrevive recargas; ante error HTTP, el modal no se cierra ni muestra éxito falso.
4. `GET /api/users?page=0&pageSize=1` y `?page=abc&pageSize=1` responden `400 VALIDATION_ERROR` (nunca `500`).
5. `POST /api/employees` con RUT con puntos hashea el PIN inicial con bcrypt, resuelve IDs concurrentes sin colisión `409`, incluye `area`, `workdayType` y metadatos de sync en contrato y OpenAPI/SDK.
6. `GET /api/employees` devuelve `[]` para `Usuario` sin `employeeId` y filtra por `area` para `Supervisor`.
7. `DELETE /api/users/:id` con el propio ID del usuario autenticado es rechazado sin eliminar la cuenta.
8. `npm run check`, `npm run lint`, `npm run check:sdk`, pruebas unitarias, de integración Fastify/PostgreSQL 18.4, `lint:budget` (`0/0`), `docs:check` y verificación headless en staging pasan al 100%.
