# Tandas amplias de deuda técnica

Seguimiento posterior a [025](spec.md), vinculado al [backlog](backlog.md).
Cada tanda agrupa un área funcional con contrato correctivo, pruebas de fallos,
pruebas nativas Fastify, CI de ambos paquetes y un commit al cerrar la tanda.
No crear nuevas specs de migración. No se hace push automático.

1. Medidores y notas — completada. Contrato: [data-tools-consistency](data-tools-consistency.md).
   Validación: 637 pruebas de integración, 11 unitarias/contrato, 279 frontend; CI,
   SDK, docs, specs y secretos correctos. Sin migración de base de datos.
   - Fechas de Chile con límites exclusivos y DST, filtro mensual efectivo.
   - Validación de fechas/deltas/filtros y paginación acotada/determinista.
   - Actor de sesión en notas; creación/archivo/borrado y auditoría atómicos.
   - OpenAPI/SDK y caracterizaciones legacy actualizados al contrato correctivo.
2. Configuración y archivos — completada. Contrato: [config-policy-consistency](config-policy-consistency.md).
   Validación: 651 pruebas de integración, 6 unitarias de flujos, 279 frontend;
   CI, SDK, docs, specs y secretos correctos. Sin migración de base de datos.
   - Config write/audit atómicos; permisos/redacción de históricos y payloads.
   - Validación real de PDF y limpieza de archivo huérfano al fallar persistencia.
3. Correo y reportes programados — completada. Contrato: [email-reports-consistency](email-reports-consistency.md).
   Validación: 707 pruebas de integración, 39 unitarias/contrato, 279 frontend;
   CI, SDK, docs, specs y secretos correctos. Sin migración de base de datos.
   - Contrato nativo compartido, defaults aplicados y extras rechazados.
   - Credenciales serializadas y auditoría atómica para configuración y reportes.
   - Cron de cinco campos en Chile, timers por próxima ejecución y toggle atómico.
   - Fallo de entrega no marca éxito; adjunto conserva formato y MIME real.
4. Importación y exportación — completada. Contrato: [import-export-consistency](import-export-consistency.md).
   Validación: 731 pruebas de integración, 25 unitarias/contrato, 280 frontend;
   CI, SDK, docs, specs y secretos correctos. QA visual/texto con Poppler.
   Sin migración de base de datos.
   - Fechas reales/ordenadas, mapping estructural y serialización String del frontend.
   - Cuatro PDF reales paginados, filtros/borrados/cobertura y horas ISO/legacy corregidos.
   - Calendario de Chile con contexto por lote; fecha civil de bitácora conservada.
   - Fallo del PDF detallado devuelve error HTTP neutral, sin documento parcial.
   - Pruebas de contenido y QA visual de los cuatro reportes, paginación y bitácora.
5. Operaciones y rendimiento — completada.
   Primer bloque: [propiedad y drenaje del seed](seed-runtime-consistency.md).
   Validación: 733 pruebas de integración, 15 unitarias y 280 frontend; ambos CI,
   SDK, docs, specs y secretos correctos. Sin migración de base de datos.
   - Fase 1 reserva mantenimiento hasta finalizar el trabajo real; timeout sin doble cierre.
   - Runtime espera fase 1 antes de pools y rechaza admisión durante apagado.
   - Configuración inicial por lote y agrupación lineal de asignaciones.
     Segundo bloque: [scheduler y contención KPI](scheduler-kpi-concurrency.md).
     Validación: 735 integración, 18 unitarias y 280 frontend; ambos CI, SDK, docs,
     specs y secretos. Carga aislada de ambos diseños repetida tres veces.
     Incluye migración de contador en 64 filas; no se aplicó a BD del usuario.
   - Reclamación distribuida de una misma ocurrencia cron antes de renderer/envío.
   - Admisión y drenaje de reportes manuales/automáticos antes de cerrar pools.
   - Contención KPI medida en BD aislada; generación repartida en 64 filas transaccionales.
     Tercer bloque: [drenaje de flujos administrativos](admin-operation-drain.md).
     Validación: 735 integración, 3 nuevas unitarias y ambos CI; docs, specs y secretos.
   - Registro de promesas reales de admin y maintenance, independiente de la respuesta.
   - Admisión cerrada y drenaje antes de jobs, sockets y pools en ambos servidores.
   - Prueba de escritura real durante cierre y errores preservados para el consumidor.
     Cuarto bloque: [consistencia de backup y restore](backup-restore-consistency.md).
     Validación: 391 integración nativa, 562 unitarias/contrato y 280 frontend;
     ambos CI, cobertura, SDK, docs, specs y secretos. Sin migración de BD.
   - Restore atómico con rollback ante errores SQL y temporales propios.
   - Publicación de backups verificados, limpieza de fallos y retención tolerante a errores.
   - PostgreSQL 18.4 explícito y regresiones con motores reales en BD desechable.
     Quinto a séptimo bloques: [barrera y coordinación distribuida](runtime-coordination.md).
     Validación: 402 integración nativa y 570 unitarias/contrato con cobertura;
     280 frontend; ambos CI, SDK, docs, specs, secretos y carga aislada en tres
     procesos correctos.
   - Propiedad HTTP hasta terminar el trabajo real, incluso después de respuesta/abort.
   - Permisos persistentes fuera de public, cierre distribuido de admisión y drenaje.
   - Exclusión de reportes manuales/automáticos/ocurrencias distintas y jobs sin TTL.
   - Backup excluye coordinación; restore/reset la conservan; recuperación offline explícita.
   - Restore confirmado con fallo de revocación permanece bloqueado.
     Incluye migración de coordinación; solo validada en BD desechable.

Los detalles concretos de las tandas 4–5 se delimitan al inspeccionar cada área.
No implican cambios de permisos ni despliegue sin una instrucción para ello.

Prioridad resuelta antes de continuar tandas: [retiro definitivo de Express](express-retirement.md).
Validación del retiro: 387 integración, 562 unitarias/contrato y 280 frontend;
ambos CI, cobertura, docs, specs, secretos y benchmark Fastify correctos.
Toda implementación posterior usa exclusivamente Fastify.
