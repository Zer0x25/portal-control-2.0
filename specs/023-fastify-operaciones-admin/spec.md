# Spec 023: Mantenimiento y administración

- Estado: Implementada y validada localmente
- Fecha: 2026-10-07
- Dependencia: [022](../022-fastify-auditoria/result.md)

## PRD

Integrar las 21 rutas restantes de administración/mantenimiento con casos de uso
compartidos y aplicación pura, preparando el runtime integrado 024. Express sigue
principal; no se autoriza un backup/restore/reinicio sobre entornos del usuario.

## SDD e inventario

Todas las rutas requieren sesión y Administrador exclusivamente. Ausencia de
sesión 401; cualquier otro rol 403, incluido Supervisor Elevado. Todas conservan
1 MiB JSON. La validación verifica, sin reemplazar body/query.

| Método y ruta                                | Validación                     | Resultado y efectos                                                                        |
| -------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| GET /api/admin/stats                         | Sin entrada adicional          | 200 success/data; estadísticas BD                                                          |
| GET /api/admin/diagnose-autoclose            | Sin entrada adicional          | 200 diagnóstico                                                                            |
| POST /api/admin/trigger-autoclose            | Sin entrada adicional          | 200 closedCount; cierre y auditoría de actor                                               |
| POST /api/admin/trigger-accounting-autoclose | Sin entrada adicional          | 200 applied/candidate/currentLock; cierre y auditoría                                      |
| GET /api/admin/security-insights             | Sin entrada adicional          | 200 estadísticas MFA y alertas recientes                                                   |
| GET /api/admin/integrity-status              | Sin entrada adicional          | 200 snapshot local del proceso                                                             |
| POST /api/admin/trigger-backup               | Sin entrada adicional          | 200 backupPath; operación backup, health success y auditoría; finish en finally            |
| POST /api/admin/purge-sessions               | Username opcional no vacío     | 200 deletedCount/target; preserva sesiones del actor en purge global; objetivo ausente 404 |
| POST /api/admin/reset-password               | Username, password mínimo seis | 200 mensaje; hash y flag de cambio forzado, auditoría                                      |
| GET /api/admin/backups                       | Sin entrada adicional          | 200 success/data lista de backupHealthService                                              |
| POST /api/admin/restore                      | RestoreBackupSchema            | 200 mensaje; restore, invalidar sesiones, auditoría, responder, restart, finish            |
| POST /api/admin/restart                      | Sin entrada adicional          | 200 mensaje; auditoría, responder, solicitar restart                                       |
| DELETE /api/maintenance/clear-database       | Sin entrada adicional          | 200 JSON por líneas progress/result/error; reset crítico, flush y restart tras respuesta   |
| POST /api/maintenance/seed                   | SeedOptionsSchema              | 200 JSON por líneas; fase 1 y precrear job detenido                                        |
| POST /api/maintenance/seed/phase1            | SeedOptionsSchema              | Alias exacto de seed                                                                       |
| POST /api/maintenance/seed/phase2/start      | SeedPhase2StartSchema          | 200 success/job; defaults, persistir y disparar ejecución                                  |
| POST /api/maintenance/seed/phase2/pause      | SeedPhase2JobSchema            | 200 success/job; estado, log y evento                                                      |
| POST /api/maintenance/seed/phase2/resume     | SeedPhase2JobSchema            | 200 success/job; estado, log/evento y ejecución                                            |
| POST /api/maintenance/seed/phase2/stop       | SeedPhase2JobSchema            | 200 success/job; estado final y log/evento                                                 |
| GET /api/maintenance/seed/phase2/status      | Sin schema extra               | 200 success/job; por id o más reciente                                                     |
| GET /api/maintenance/seed/phase2/logs        | Controller exige jobId         | 200 success/logs; default limit 200, clamp servicio 1–1000                                 |

Admin/maintenance conservan exclusión del limiter global y gate maintenance por
prefijo. Admin tiene presupuesto compartido 1000/IP/15 min antes de auth;
maintenance no tiene presupuesto propio. Health mantiene su exclusión.
Todas las rutas maintenance deshabilitan compresión, no solo las de streaming.
Corrección declarada: Express evaluaba req.path dentro del router y podía comprimir
el progreso con Accept-Encoding gzip. El filtro ahora usa originalUrl, como exige
su intención original. Las pruebas RED de paridad detectaron esta desviación;
Fastify usa la opción de ruta compress=false. No se cambia el formato ni el body.

Aplicación en modules/admin y modules/maintenance solo recibe puertos; no importa
Prisma, HTTP, FS, procesos, ALS ni reloj. Watchdog y contexto SYSTEM_SEEDER/
skipTrigger se inyectan desde composición. Admin usa callbacks de respuesta para
conservar send antes de restart y finish. Guards exactos no vacíos y strict.

## Deudas y límites heredados

Operación actual, integridad y backup health son locales al proceso. Conflicto de
operación 409 antes de responder; no es un lock distribuido. Seed no participa en
exclusión reset/restore. Watchdog no cancela el trabajo; timeout de limpieza usa
callback que puede lanzar fuera del await. JSON por líneas declara application/json;
fallo iniciado mantiene 200 con error in-band. No añadir retries automáticamente.
Usuario/job inexistente conserva 404 (Prisma P2025); otras fallas mantienen 500.
ResetPassword no invalida sesiones; purge dirigido puede borrar la sesión actual.
Restore valida solo string no vacío; controles de path/herramientas siguen en
backupService. BACKUP_ENABLED no impide trigger manual; health manual no registra
failure en el controller. Auditoría global de errores conserva body fuera de auth:
puede incluir newPassword de reset; requiere redacción antes de cutover.
Reinicio dev todavía toca index.ts; resolver en 024.
Reset real: TRUNCATE CASCADE borra también la tabla users, aunque preservedUser
informa el actor; después recrea admin con contraseña fija heredada. Además no
limpia seeding_jobs/logs. Ambas deudas se comprobaron en BD desechable; corregir
consistencia/credenciales y coordinar jobs antes de 025 con contrato explícito.
Siembra conserva límites/datos/defaults y queries heredadas del motor, fuera de
esta extracción; no certificar ausencia de N+1 ni benchmarks de ese servicio.

## Criterios de aceptación

- [x] AC1: Inventario no vacío con las 21 rutas, permisos, validación y efectos.
- [x] AC2: Cuatro RED y BDD antes de implementar.
- [x] AC3: Dos módulos puros, puertos tipados, adaptadores y guards strict/públicos.
- [x] AC4: Paridad con BD aislada, streaming, seguridad y fallos sin efectos host.
- [x] AC5: Gates secuenciales, docs, ratchets y resultado/rollback.

## Trazabilidad

[Plan](plan.md), [BDD](behavior.md), [tareas](tasks.md), [resultado](result.md).
