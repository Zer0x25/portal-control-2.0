# Mejoras posteriores al cutover

Spec: [025](spec.md). Estas deudas no bloquean la migración en desarrollo, por
decisión del usuario del 2026-10-07. No representan nuevas specs de migración.

- Mantenimiento sin interrupciones: barrera común de trabajo HTTP/jobs/scheduler,
  ownership de seed fase 1 hasta terminar trabajo real, admisión cerrada hasta
  shutdown y coordinación reset/restore. Hoy puede requerir purgar/reiniciar.
- Fechas Chile y consultas por día del calendario mensual (015): corregidas en
  [monthly-calendar-chile](monthly-calendar-chile.md).
- Ownership de Usuario/quiosco en assignments y correcciones (015/016):
  corregido en [self-only-scope](self-only-scope.md) y
  [corrections-ownership](corrections-ownership.md).
- Reactivación, solapamiento y atomicidad al extender permisos (016).
- Consistencia del ciclo de vida/folios de reportes y motor KPI (017/018).
- Fechas/mapping/contratos de exportación e importación; renderers parciales (021).
- Operaciones resilientes ante múltiples procesos e interrupciones; políticas de
  revocación en otras rutas de cambio de credenciales y redacción de texto libre.

La evidencia y límites detallados permanecen en los resultados 015–024 y en
[roadmap](../roadmap-fastify.md). Corregir cada defecto con contrato/prueba propios
cuando se trabaje en él, sin retrasar nuevamente el uso de Fastify por defecto.
