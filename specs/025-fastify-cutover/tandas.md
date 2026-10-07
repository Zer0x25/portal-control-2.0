# Tandas amplias de deuda técnica

Seguimiento posterior a [025](spec.md), vinculado al [backlog](backlog.md).
Cada tanda agrupa un área funcional con contrato correctivo, pruebas de fallos,
paridad Express/Fastify, CI de ambos paquetes y un commit al cerrar la tanda.
No crear nuevas specs de migración. No se hace push automático.

1. Medidores y notas — completada. Contrato: [data-tools-consistency](data-tools-consistency.md).
   Validación: 637 pruebas de integración, 11 unitarias/contrato, 279 frontend; CI,
   SDK, docs, specs y secretos correctos. Sin migración de base de datos.
   - Fechas de Chile con límites exclusivos y DST, filtro mensual efectivo.
   - Validación de fechas/deltas/filtros y paginación acotada/determinista.
   - Actor de sesión en notas; creación/archivo/borrado y auditoría atómicos.
   - OpenAPI/SDK y caracterizaciones legacy actualizados al contrato correctivo.
2. Configuración y archivos.
   - Config write/audit atómicos; permisos/redacción de históricos y payloads.
   - Validación real de PDF y limpieza de archivo huérfano al fallar persistencia.
3. Correo y reportes programados.
   - Alinear schemas y servicios, aplicar defaults y rechazar extras peligrosos.
   - Cron completo y zona horaria explícita; toggle concurrente atómico.
4. Importación y exportación.
   - Fechas de Chile, mapping y contratos pendientes; renderers parciales.
   - Pruebas de contenido y QA visual para artefactos cuyo layout cambie.
5. Operaciones y rendimiento.
   - Admisión/drenaje común de HTTP/jobs/scheduler y watchdog del seed.
   - Coordinación entre procesos para reset/restore y scheduler.
   - Evaluar contención e invalidación global KPI; optimizar con evidencia de carga.

Los detalles concretos de las tandas 2–5 se delimitan al inspeccionar cada área.
No implican cambios de permisos ni despliegue sin una instrucción para ello.
