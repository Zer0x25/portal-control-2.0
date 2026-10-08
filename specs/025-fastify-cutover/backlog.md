# Mejoras posteriores al cutover

Spec: [025](spec.md). Estas deudas no bloquean la migración en desarrollo, por
decisión del usuario del 2026-10-07. Seguimiento por [tandas amplias](tandas.md). No representan nuevas specs de migración.

- Barrera de trabajo HTTP/jobs, cierre y coordinación reset/restore: corregidas
  en [coordinación del runtime](runtime-coordination.md), junto a seed,
  scheduler y drenaje administrativo. Se requiere recuperación offline explícita
  ante claims abandonados; no hay continuidad automática ni mezcla de versiones.
- Fechas Chile y consultas por día del calendario mensual (015): corregidas en
  [monthly-calendar-chile](monthly-calendar-chile.md).
- Ownership de Usuario/quiosco en assignments y correcciones (015/016):
  corregido en [self-only-scope](self-only-scope.md) y
  [corrections-ownership](corrections-ownership.md).
- Reactivación, solapamiento y atomicidad al extender permisos (016): corregidas
  en [leave-consistency](leave-consistency.md).
- Apertura, folios y atomicidad de reportes (017): corregidas en
  [shift-report-consistency](shift-report-consistency.md). Exportación legacy
  corregida en [shift-report-legacy-export](shift-report-legacy-export.md).
  Contexto diario KPI (018) corregido en
  [kpi-daily-context-chile](kpi-daily-context-chile.md). Materialización mensual
  y recuperación de caché corregidas en
  [kpi-monthly-materialization](kpi-monthly-materialization.md). Invalidación
  por cambios de fuentes corregida en [kpi-cache-invalidation](kpi-cache-invalidation.md).
- Atomicidad y autoría de lotes de medidores (020): corregidas en
  [meter-batch-consistency](meter-batch-consistency.md). Fechas/filtros, paginación y consistencia de notas se cubren en
  [data-tools-consistency](data-tools-consistency.md).
- Fechas, mapping y cuatro PDF reales de importación/exportación (021):
  corregidos en [import-export-consistency](import-export-consistency.md).
  Sus límites de memoria, tipos raw y errores históricos están documentados allí.
- Políticas de revocación en otras rutas de cambio de credenciales y redacción de
  texto libre permanecen fuera del alcance de las cinco tandas actuales.

La evidencia y límites detallados permanecen en los resultados 015–024 y en
[roadmap](../roadmap-fastify.md). Corregir cada defecto con contrato/prueba propios
cuando se trabaje en él, sin retrasar nuevamente el uso de Fastify por defecto.

Tanda 2: [consistencia de configuración y PDF](config-policy-consistency.md).

Tanda 3: [contrato de correo y reportes](email-reports-consistency.md).

El drenaje local de las fachadas administrativas está implementado en
[drenaje de flujos administrativos](admin-operation-drain.md). La barrera universal
y reset/restore distribuido se cierran en [coordinación del runtime](runtime-coordination.md).

Prioridad resuelta antes de continuar tandas: [retiro definitivo de Express](express-retirement.md).
Toda implementación posterior usa exclusivamente Fastify.

Backup y restore corrigen atomicidad SQL, publicación y temporales en
[consistencia de backup y restore](backup-restore-consistency.md); la coordinación
distribuida está cubierta por [coordinación del runtime](runtime-coordination.md).
