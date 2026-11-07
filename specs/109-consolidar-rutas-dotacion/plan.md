# Plan 109: Consolidar rutas de Dotación

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Hacer que el estado de pestaña de la pantalla agrupadora derive del query param `tab`.
2. Mostrar `Accesos` solo para Administrador y Supervisor Elevado; dejar empleados como
   contenido disponible para los cuatro roles que hoy administran personal.
3. Convertir las rutas independientes en redirects con `replace` al destino canónico,
   manteniendo el guard de cada ruta original.
4. Ajustar el menú para que los roles con acceso a ambas funciones vean solo `Dotación` y
   los roles con acceso exclusivo a empleados vean `Personal` dentro de la ruta canónica.
5. Confirmar TypeScript/build y revisar estáticamente la matriz de navegación/roles sin cambiar
   servicios ni datos.

## Archivos a tocar

| Archivo                                                                                   | Cambio                                                                                   |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `frontend/src/App.tsx`                                                                    | Alias de rutas con guards y redirects; acceso al hub para roles que gestionan empleados. |
| `frontend/src/features/personnel-management/hooks/usePersonnelManagementData.ts`          | Sincronizar la pestaña con `tab` y validar acceso a `users`.                             |
| `frontend/src/features/personnel-management/containers/PersonnelManagement.container.tsx` | Pasar permisos y montar contenido de cuentas solo para roles autorizados.                |
| `frontend/src/features/personnel-management/views/PersonnelManagement.view.tsx`           | Ocultar la pestaña Accesos para roles sin permiso.                                       |
| `frontend/src/hooks/layout/sidebarMenu.ts`                                                | Remover los dos enlaces independientes del menú y apuntar al tab adecuado.               |
| `specs/109-consolidar-rutas-dotacion/`                                                    | Mantener requisitos, plan y trazabilidad de la consolidación.                            |

## Contratos afectados

Solo rutas del cliente y query param de pestaña. Se conservan los alias antiguos. No cambian
Fastify, endpoints, OpenAPI, SDK, Prisma ni migraciones.

## Riesgos y rollback

- Riesgo: los roles de solo empleados podrían quedar bloqueados por el guard actual del hub.
  Mitigación: ampliar el guard del hub a los roles ya autorizados en `/employee-management`
  y ocultar el tab `users` para ellos.
- Riesgo: romper bookmarks. Mitigación: conservar ambos paths como redirects protegidos.
- Rollback: restaurar la matriz anterior de rutas y el menú; no hay cambios persistentes en BD.

## Verificación

- `npm --prefix frontend run check`
- `npm --prefix frontend run build`
- Revisión de código de la matriz AC1–AC5 y de ambos alias; no se requieren credenciales de sesión.
