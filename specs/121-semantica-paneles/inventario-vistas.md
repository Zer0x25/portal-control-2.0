# Inventario para adopción semántica

Inventario estático del 2026-11-21 basado en [las rutas de la aplicación](../../frontend/src/App.tsx) y [sus constantes](../../frontend/src/constants.ts). Las prioridades son una propuesta de secuencia por frecuencia operativa y variedad de controles, no una medición de uso ni una auditoría de conformidad. Cada vista requiere revisión por estados, roles y tamaños antes de marcarse como adoptada.

| Prioridad | Vista                          | Ruta                    | Seguimiento                                                              |
| --------- | ------------------------------ | ----------------------- | ------------------------------------------------------------------------ |
| Piloto    | Dashboard                      | `/dashboard`            | En revisión; ver [pendientes](pendientes.md).                            |
| Piloto    | Supervisión                    | `/dashboard-supervisor` | En revisión; incluye sus secciones y diálogos.                           |
| Piloto    | Bitácora                       | `/logbook`              | Mejoras iniciadas; faltan estados y roles.                               |
| 1         | Control de asistencia          | `/time-control`         | Pendiente de auditoría y adopción.                                       |
| 1         | Calendario de turnos           | `/shift-calendar`       | Pendiente de auditoría y adopción.                                       |
| 1         | Portal del trabajador          | `/worker-portal`        | Pendiente de auditoría y adopción con rol autorizado.                    |
| 1         | Registro de medidores          | `/meter-readings`       | Pendiente de auditoría y adopción.                                       |
| 1         | Comunicados                    | `/communications`       | Pendiente de auditoría y adopción.                                       |
| 2         | Turnos teóricos                | `/theoretical-shifts`   | Pendiente de auditoría y adopción.                                       |
| 2         | Planificación mensual          | `/planning/monthly`     | Pendiente de auditoría y adopción.                                       |
| 2         | Gestión de personal            | `/personnel-management` | Pendiente de auditoría; incluye empleados y usuarios.                    |
| 2         | Quiosco                        | `/kiosk`                | Pendiente de auditoría; recorrido y pantalla específicos.                |
| 3         | Configuración                  | `/configuration`        | Pendiente de auditoría; incluye correo y datos maestros.                 |
| 3         | Gobernanza                     | `/admin/governance`     | Pendiente de auditoría; incluye auditoría, integridad y sistema.         |
| 3         | Catálogo del sistema de diseño | `/design-system`        | Pendiente de auditoría y alineación de ejemplos.                         |
| 3         | Inicio de sesión               | `/`                     | Pendiente de auditoría; no usa necesariamente el mismo layout protegido. |

Las rutas antiguas que redirigen a secciones de Personal, Configuración o Gobernanza se revisan junto con sus destinos. La ruta de página no encontrada se revisará como estado compartido. La prioridad no autoriza a considerar ninguna vista cubierta sin evidencia.
