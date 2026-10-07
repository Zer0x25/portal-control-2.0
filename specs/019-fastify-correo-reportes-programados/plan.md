# Plan 019: Correo y reportes programados

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Implementación

- modules/emailReports/application/contracts.ts: tipos neutrales y puertos SMTP/reportes.
- application/flows.ts: orquestación, mensajes, campos requeridos y 404.
- index.ts: API pública; http/routes.ts: doce rutas nativas, roles y validación marcada.
- services/emailReportFlows.ts: composición EmailService/ScheduledReportService,
  schemas SMTP y adaptación ValidationError. Mantiene persistencia/cifrado/reloj en servicios.
- controllers EmailController/scheduledReportController: adaptadores Express delgados.
- models/schemas/smtpProfile.schemas.ts: schemas antes locales, sin cambiar contrato.
- EmailService/ScheduledReportService: tipos reexportados desde módulo, lógica intacta.
- plataforma/runtime: registro y dependencias; manifest exacto para ambas familias;
  tsconfig.modules y guard de arquitectura incluyen módulo nuevo.

## Pruebas y gates

Cuatro casos unitarios RED antes de implementación; paridad con proveedor doble y
BD desechable en tests/fastify-integration/emailReports.test.ts. Guards no vacíos,
rutas ausentes/extras/auth/validación y prohibiciones de importaciones privadas.
Backend validate:ci, cobertura y integración aislada. Después de terminar SDK,
frontend validate:ci:coverage. Raíz docs:check, spec:check, secrets:scan y diff check.
No activar jobs, sockets ni usar SMTP real; staging/e2e/carga quedan para 024/025.

## Rollback

Revertir entrega 019 (registro candidato, módulo, composición y adaptadores)
restaura controllers Express anteriores. No requiere migración de BD ni cambio
operativo; sistema principal sigue Express. Cifrado y datos conservan su formato.
