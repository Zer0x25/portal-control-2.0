# Resultado 023: Mantenimiento y administración

- Fecha: 2026-10-07
- Estado: Implementada y validada localmente
- Spec anterior: 022, commit `1f98dd5` con hooks aprobados
- Spec 023: cambios locales sin commit

## Entrega

21 rutas nativas: 12 admin y nueve maintenance/seed. Dos módulos con aplicación
pura, puertos de repositorio/operaciones/watchdog/contexto/reinicio y API index.ts.
Controllers Express delgados usan los mismos flujos. Schemas admin se movieron
sin cambiar contrato. Se conserva respuesta antes de restart/finish, progreso
JSON por líneas y permisos Administrador exclusivamente.

Admin usa presupuesto compartido 1000/IP/15 min antes de auth; admin/maintenance
mantienen exclusión global y del gate, health conserva su bypass. JSON conserva
1 MiB; mantenimiento no comprime. Corrección declarada: Express leía req.path
relativo dentro del router, pudiendo activar gzip; ahora filtra originalUrl.
Fastify usa opción de ruta compress=false. Tests con Accept-Encoding gzip
comprueban progreso y JSON de mantenimiento mayor a 3 KiB sin compresión.

## Evidencia

- Cuatro RED con factories pendientes antes de implementar; cuatro GREEN.
- Focalizadas de flujos/HTTP/guards: 207 pruebas en cuatro archivos.
- Cobertura backend: 469 pruebas en 52 archivos, ratchets aprobados.
- Paridad 023: 52 pruebas (26 por adaptador) con PostgreSQL 18.4 propietario;
  runner temporal reutilizó exactamente propiedad/URL/cleanup del runner oficial.
- Las pruebas verifican las 21 rutas sin sesión y cinco roles no Admin con JWT
  Admin obsoleto; estadísticas, insights, autocierre vacío y cierre contable real.
- Purge global/dirigido, reset hash/flag/sesiones, auditoría actor y ciclo de jobs
  se comprobaron en BD real. Worker run fue doble para no dejar tareas background.
- Restore y backup fueron dobles de frontera host; invalidación de sesiones real
  y eventos capturados con spies. Restart fue siempre doble; nunca proceso real.
- Clear ejecutó TRUNCATE solo en BD desechable; fase 1 real se acotó a cero
  empleados/días/notas (configuración se persiste, patrones siguen vacíos).
- Unit verifica send antes de restart/finish y liberación en fallo/conflicto.
  HTTP verifica timeout/error in-band 200, stopped-job failure absorbido, ALS
  SYSTEM_SEEDER/skipTrigger tras awaits y compresión deshabilitada.
- Suite integrada completa final: 493 pruebas en 18 archivos, sin fallos.
- Backend validate:ci final: formato, lint 0/0, tipos global/holidays/modules,
  SDK sin diff, nueve pruebas de schemas y build aprobados.
- Frontend validate:ci:coverage: 276 pruebas en 71 archivos, tipos, formato,
  lint 0/0, cobertura y build/PWA aprobados, después del primer CI backend.
  El CI backend final revalidó la corrección de compresión; SDK permaneció sin diff.
- Raíz: docs:check (137 Markdown/19 ADR), spec:check (25 specs), secrets:scan
  (0 secretos/31 entradas permitidas) y git diff --check aprobados.
- PostgreSQL desechables eliminados por cada runner, archivo runner temporal
  eliminado. La BD local existente no fue reutilizada ni detenida.

Logs: /tmp/portal-023-red.log, /tmp/portal-023-green.log,
/tmp/portal-023-focused.log, /tmp/portal-023-coverage.log,
/tmp/portal-023-integration.log, /tmp/portal-023-backend-final.log,
/tmp/portal-023-frontend-ci.log. Los primeros intentos detectaron la compresión
Express, opción native mal ubicada (config frente a opción de ruta) y expectativas
404/patrones vacíos; la última implementación corrige y caracteriza cada caso.

## Deudas y límites

Reset no preserva realmente actor por TRUNCATE CASCADE, recrea admin con password
fijo heredado y conserva jobs. Hay pruebas explícitas; corregir antes de cutover.
La migración no hace atómicas las operaciones ni cancela trabajo del watchdog.
Estado/locks son locales; seed puede solaparse con restore/reset; jobs/lifecycle y
restart dev están pendientes de 024. Auditoría global puede persistir newPassword
al fallar reset; la redacción sigue pendiente de un contrato explícito.

No staging, e2e, gateway, PgBouncer en pruebas, carga, clientes Socket reales,
pg_dump/psql ni restauración/reinicio reales. No nuevas dependencias ni cambios
Prisma/SDK. No se mide rendimiento ni se certifica el motor de siembra completo.

## Rollback y siguiente

Revertir 023 completo restaura controllers y configuración HTTP previos, retira
plugins/contratos nativos sin rollback de BD; revierte también la corrección gzip.
Express sigue principal. Próximo: 024 runtime integrado; después 025 cutover.
