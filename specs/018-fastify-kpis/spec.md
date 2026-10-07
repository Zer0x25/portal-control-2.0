# Spec 018: KPI

- Estado: Implementada y validada localmente
- Fecha: 2026-10-06
- Ruta: [roadmap](../roadmap-fastify.md)

## Problema

La superficie /api/kpis debe integrarse al candidato Fastify para completar
la migración modular y disponer de contratos y pruebas mantenibles.

## Alcance

Resultados calculados, caché, invalidación y periodos de negocio. Inventariar cada ruta real antes de implementar, incluidas las
anidadas. Compartir casos de uso entre los adaptadores cuando corresponda.

Fuera: módulos de otras specs y cambios de producto no declarados. Esta spec
es una previsión; no autoriza despliegues ni operaciones externas.

## Criterios de aceptación

- [x] AC1: Inventario no vacío con método, path, permisos, validación, respuestas y efectos de cada ruta/flujo.
- [x] AC2: BDD concreto y pruebas RED antes de implementar; comportamiento vigente y errores caracterizados.
- [x] AC3: Implementación con puertos tipados, límites públicos y sin dependencias de infraestructura en aplicación.
- [x] AC4: Paridad verificada con BD aislada donde aplique; contratos de seguridad y fallos comprobados.
- [x] AC5: Gates backend/frontend secuenciales, docs/SDK y ratchets aprobados; resultado con límites y rollback.

## Restricciones

Constitución I–V, Node 26, React/Vite y PostgreSQL se conservan. Usar
withDirectTransaction para transacciones interactivas. No reducir ratchets.
El cambio de servidor principal se reserva a 025. Para 025, AC3 exige además
retirar dependencias Express una vez demostrado el rollback.

## Trazabilidad

Dependencia prevista: 017; revisar dependencias reales al iniciar.
Tests y archivos concretos se detallarán tras el inventario de AC1.

## Inventario verificado

Todas las rutas requieren sesión persistida y rol Administrador,
Supervisor_Elevado, Supervisor o Reloj_Control; Usuario y quiosco quedan fuera.
Límite de body 1 MiB; no se introducen sockets ni jobs.

| Método | Path                      | Validación                      | Respuesta 200                         | Efectos                                            |
| ------ | ------------------------- | ------------------------------- | ------------------------------------- | -------------------------------------------------- |
| POST   | /api/kpis/summary         | KpiSummaryRequestSchema y rango | kpis/kpiDetails, sin envelope         | lectura y materialización de caché mensual cerrada |
| POST   | /api/kpis/detailed-report | mismo schema y rango            | summary/details, sin envelope         | igual                                              |
| GET    | /api/kpis/overview        | sin entrada funcional           | teamStatus/employeeStatuses/timestamp | lectura                                            |
| GET    | /api/kpis/daily-planning  | sin entrada funcional           | contadores de planificación           | lectura                                            |

endDate es inclusivo y se convierte a exclusivo; endDateExclusive prevalece.
Inicio debe ser menor que fin exclusivo. Máximo 365.25 días; cinco veces ese
límite solo con exactamente un employeeIds. employeeId/departmentId legacy
están admitidos por schema pero no filtran. Validación no reemplaza body.
Errores: 400 schema/rango, 401 sesión, 403 rol, 500 infraestructura.

## Límites y deudas heredadas

No se reescribe el motor ni se promete mejora de rendimiento. Reportes filtran
por IDs/área pero incluyen archivados; IDs vacíos no restringen. Cambio declarado: overview y kpiDetails.absentEmployees eliminan PIN mediante
proyección pública compartida de empleados en ambos servidores. Contexto diario consulta fecha UTC; reloj/formato local y cobertura
contextual de ayer son deudas del motor. Cache cerrada no tiene invalidación
automática; fallback de lock falla abierto y cache miss conserva consultas por
empleado/mes. No introducir estos patrones en aplicación nueva.

Schema de fecha valida formato, no calendario: 2026-02-30 puede devolver 200
en ambos servidores. Caracterizado y pendiente de contrato correctivo antes de cutover.
