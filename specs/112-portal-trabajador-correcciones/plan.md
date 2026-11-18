# Plan: Portal del trabajador y correcciones

## Estrategia

1. Asegurar serialización y validación transaccional de jornada, cierre y solicitudes, incluyendo auditoría atómica y publicación post-commit; preservar datos históricos.
2. Alinear Fastify, esquemas, OpenAPI y SDK; validar consultas, crear conflicto claro y rechazar adjuntos no soportados.
3. Deshabilitar adjuntos, bloquear marcaje durante estado incierto y exponer historial propio; consumir todas las pendientes relevantes.
4. Corregir ICS, impresión segura y feedback; reparar huso horario y paginación PDF y cache de reportes.
5. Ejecutar pruebas focalizadas, integración PostgreSQL aislada, chequeos de contratos y verificación Playwright en staging reconstruido. Actualizar flujo únicamente según evidencia.

## Superficies

| Superficie                       | Trabajo                                                                            |
| :------------------------------- | :--------------------------------------------------------------------------------- |
| Backend correcciones y auditoría | `CorrectionService`, `auditService`, cierres, transacciones, Fastify y validadores |
| Backend informes                 | `KpiStatsService`, cache mensual y `ExportService`                                 |
| Frontend portal                  | hooks, vista, modal y servicio de historial                                        |
| Frontend calendario              | controlador, utilidades de ICS e impresión y pruebas                               |
| Contratos y docs                 | OpenAPI, SDK, inventario de flujo y pruebas de integración                         |

## Contratos, riesgos y rollback

Ajustar `/api/corrections` de forma compatible con clientes existentes y sincronizar el SDK. Bloqueos deben usar orden coherente y conexión directa; no agregar una restricción que elimine o impida migrar duplicados históricos. Revertir por commits aislados si una regresión lo requiere; nunca destruir datos de staging, producción o auditoría como rollback.
