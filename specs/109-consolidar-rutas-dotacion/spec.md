# Spec 109: Consolidar rutas de Dotación

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-11-02
- ADR relacionado: N/A

## Problema

El menú actual ofrece `Personal`, `Usuarios` y `Dotación` como tres destinos distintos
para administrar empleados y cuentas. `PersonnelManagementContainer` ya compone los
contenedores existentes en pestañas, pero `App.tsx` también conserva las rutas
independientes, lo que hace parecer que las listas compiten o duplican datos.

## Alcance

Dentro:

- Usar `/personnel-management` como entrada unificada con pestañas `Empleados` y `Accesos`.
- Mantener `?tab=employees|users` en la URL para compartir, recargar y navegar entre pestañas.
- Redirigir las rutas independientes existentes a la pestaña equivalente.
- Conservar los permisos actuales: cuentas solo para Administrador y Supervisor Elevado;
  empleados para Administrador, Supervisor, Supervisor Elevado y Reloj Control.
- Unificar las entradas del menú según esos permisos.

Fuera (explícito):

- Unir los modelos `User` y `Employee`, modificar tablas o migrar registros.
- Cambiar endpoints, contratos HTTP, SDK o lógica de negocio de las listas.
- Eliminar compatibilidad con enlaces guardados a las rutas independientes.

## Criterios de aceptación

- [x] AC1: Administrador y Supervisor Elevado ven `Empleados` y `Accesos` en `/personnel-management`.
- [x] AC2: Supervisor y Reloj Control solo ven `Empleados`; no montan ni consultan la vista de cuentas.
- [x] AC3: `/user-management` redirige a `/personnel-management?tab=users` y
      `/employee-management` a `/personnel-management?tab=employees`, respetando los guards actuales.
- [x] AC4: La pestaña seleccionada se refleja en `tab`; una URL sin `tab` abre `Empleados`.
- [x] AC5: El menú de Administrador/Supervisor Elevado ofrece `Dotación` como única entrada
      de estas tres; Supervisor/Reloj Control conserva `Personal`, apuntando al tab `Empleados`.
- [x] AC6: Las dos pestañas siguen leyendo sus fuentes actuales (`/api/employees` y `/api/users`);
      no hay cambios en datos ni esquema.

## Restricciones

- Mantener el vínculo opcional y único `User.employeeId` → `Employee.id`.
- No cambiar la matriz de permisos del backend ni exponer la pestaña de cuentas a roles sin permiso.
- Los redirects deben conservar los bookmarks y usar reemplazo de historial.

## Trazabilidad

- Verificación funcional: revisión de guards, destinos alias, query params y montaje condicional
  por rol; sin cambios en mutaciones ni datos.
- Verificación técnica: `npm --prefix frontend run check` y `npm --prefix frontend run build`.
- Docs a actualizar: esta especificación; sin cambios de API ni ADR.
