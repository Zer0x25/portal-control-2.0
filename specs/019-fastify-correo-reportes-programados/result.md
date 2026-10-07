# Resultado 019: Correo y reportes programados

Contrato: [spec](spec.md), diseño: [plan](plan.md), ejemplos: [BDD](behavior.md).
Fecha: 2026-10-06. Implementación y validación local; sin commit de esta entrega.
Commit previo: 9bc66d3, spec 018 KPI, hooks aprobados. Sin push.

## Entrega

Doce rutas nativas en Fastify comparten aplicación pura con Express. Configuración,
reglas, verificación/envío y CRUD/toggle programados usan puertos tipados. API pública
index.ts, strict y guard de arquitectura cubren módulo; manifest exacto y no vacío
para /api/email y /api/scheduled-reports rechaza extras, omisiones y rutas sin auth
o validación marcada. No cambian dependencias, BD ni swagger/SDK.

Persistencia SMTP cifra y conserva contraseñas enmascaradas; GET no expone secretos.
Transporte real se sustituye completamente por doble en tests. Roles persistidos
limitan acceso a Admin/Supervisor_Elevado. Reportes conservan actor del servidor,
JSON de filtros, normalización de destinatarios, 404 y delete 204 vacío.

## Evidencia

- RED: cuatro casos unitarios fallaron con factory stub antes de implementación,
  /tmp/portal-019-red.log. GREEN: 144 pruebas focalizadas de flujos/plataforma/guards.
- Backend validate:ci: formato, lint/budget 0/0, check global y módulos strict,
  SDK sin cambios, nueve pruebas de schema y build aprobados.
- Cobertura backend: 390 pruebas, 48 archivos; ratchet aprobado sin reducirlo.
- Integración: 303 pruebas, 14 archivos, incluyendo 42 casos 019 en Express/Fastify.
  PostgreSQL 18.4 desechable creado/eliminado por script; no utiliza BD del entorno.
  Cifrado real, máscaras, sesión/roles, fallo DB real con trigger temporal,
  schema divergente y resultados de proveedor fallido caracterizados.
- Prueba adicional de límites de body: cinco rutas POST 019 rechazan más de 1 MiB
  antes de efectos con sesión Admin. No se atribuyen esos cinco casos al run de cobertura previo.
- Frontend validate:ci:coverage: 276 pruebas en 71 archivos, tipos, formato,
  lint/budget 0/0, cobertura y build/PWA con 159 entradas precache.
- Raíz: docs:check, spec:check, secrets:scan y git diff --check.

Logs locales: /tmp/portal-019-backend-ci.log, /tmp/portal-019-coverage.log,
/tmp/portal-019-integration.log, /tmp/portal-019-frontend-ci.log,
/tmp/portal-019-body-limit.log. Logs no forman parte del repositorio.

## Límites y deudas

Schemas router/servicio incompatibles se conservan y están documentados en spec.
El body combinado permite operar hoy; requiere contrato correctivo coordinado con
frontend/SDK antes del cutover. No se recomienda ese workaround como API definitiva.
Defaults de send-test no se aplican al body. Cron es un cálculo parcial con reloj
local; toggle no es atómico bajo concurrencia; filtros falsy no borran anteriores.
No se han activado scheduler/jobs, sockets, gateway ni staging; no hay entrega
SMTP externa, benchmark de rendimiento, carga ni e2e de producción.

## Rollback y continuidad

Revertir entrega 019 restaura controllers previos y retira registro candidato,
puertos/adaptador/composición y guards nuevos; no necesita migración DB. Express
permanece principal y formato cifrado no cambia. Siguiente: 020 medidores/notas/configuración.
Quedan seis specs 020–025, incluyendo integración runtime y cutover validado en staging.
