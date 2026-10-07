# Spec 019: Correo y reportes programados

- Estado: Implementada y validada localmente
- Fecha: 2026-10-06
- Ruta: [roadmap](../roadmap-fastify.md)

## Problema y entrega (PRD)

Integrar configuración de correo y reportes programados en el candidato Fastify,
compartiendo la orquestación con Express para mantener una única implementación.
Incluye doce rutas, aplicación pura, puertos tipados y pruebas de paridad.
Express conserva el servidor principal. No se activan jobs ni se envían correos reales.
No se cambian dependencias, esquema Prisma ni contrato OpenAPI.

## Contrato e invariantes (SDD)

Todas las rutas requieren sesión persistida y Administrador o Supervisor_Elevado.
Supervisor, Reloj_Control, Fiscalizador y Usuario quedan excluidos. Body 1 MiB.
Validadores de router comprueban sin reemplazar body; SMTP parsea explícitamente
antes de verificar/guardar y conserva mensaje de error personalizado.

| Método | Path                              | Validación                                | Respuesta                      | Efectos                                |
| ------ | --------------------------------- | ----------------------------------------- | ------------------------------ | -------------------------------------- |
| POST   | /api/email/verify                 | SmtpProfileSchema en flujo                | 200 success/message            | verificación SMTP, sin guardar         |
| GET    | /api/email/config                 | sin query funcional                       | 200 tres perfiles enmascarados | lectura systemConfig                   |
| POST   | /api/email/config                 | EmailConfigSchema y MultiSmtpConfigSchema | 200 success/message            | upsert SMTP_CONFIG cifrado             |
| GET    | /api/email/rules                  | sin query funcional                       | 200 reglas sin envelope        | lectura systemConfig                   |
| POST   | /api/email/rules                  | EmailRulesSchema                          | 200 success/message            | upsert EMAIL_NOTIFICATION_RULES        |
| POST   | /api/email/send-test              | SendTestEmailSchema                       | 200 success/message            | envío por proveedor                    |
| GET    | /api/scheduled-reports            | sin query funcional                       | 200 array                      | lectura orden createdAt desc           |
| GET    | /api/scheduled-reports/:id        | id string                                 | 200 reporte                    | lectura                                |
| POST   | /api/scheduled-reports            | ScheduledReportSchema y campos legacy     | 201 reporte                    | insert, createdBy de sesión, nextRunAt |
| PUT    | /api/scheduled-reports/:id        | ScheduledReportSchema.partial             | 200 reporte                    | update parcial                         |
| PATCH  | /api/scheduled-reports/:id/toggle | id string, sin body funcional             | 200 reporte                    | alternar isActive                      |
| DELETE | /api/scheduled-reports/:id        | id string, sin body funcional             | 204 vacío                      | delete                                 |

401/403 preceden validación y efectos. Schema o campos requeridos: 400.
Reportes ausentes: 404 en read/update/toggle/delete. Infraestructura: 500.
SMTP desconectado/no configurado devuelve 200 success:false, igual que Express.
Guardar tres perfiles cifra contraseñas nuevas; ******** conserva el cifrado
anterior. GET nunca devuelve contraseña ni ciphertext. Verify con ******** usa
la contraseña descifrada del perfil activo, conservando TLS estricto por defecto.
La aplicación no conoce frameworks, DB, entorno, proveedor o reloj global.

## Criterios de aceptación

- [x] AC1: Inventario no vacío con permisos, entrada, respuesta y efectos.
- [x] AC2: Ejemplos BDD y cuatro pruebas RED antes de implementación.
- [x] AC3: Aplicación pura, API pública index.ts, puertos y adaptadores compartidos.
- [x] AC4: Paridad, sesiones persistidas, cifrado y fallos con BD desechable.
- [x] AC5: Gates backend/frontend secuenciales y resultado con rollback.

## Deudas caracterizadas, sin cambio silencioso

SMTP router espera host/auth/from pero controller espera profiles/activeProfileIndex:
cada forma sola falla 400; combinación pasa y el parse SMTP retira campos ajenos.
Rules router espera notifyOnAbsence/digestFrequency mientras motor usa
autoCloseShift/latenessOver15/latenessOver60; guarda body original, incluidos extras.
ScheduledReportSchema espera type/active mientras servicio exige
reportType/frequency/cronExpression y usa isActive. POST requiere la combinación;
PUT conserva extras del body. active no controla isActive; type no controla reportType.
Estas divergencias necesitan contrato correctivo y SDK/frontend coordinados antes de cutover.

Defaults de subject/message del schema no se asignan al body: omitir message con
SMTP configurado termina en success:false al construir HTML. Cron no se valida ni
interpreta de forma general: cálculo legacy mañana/lunes/próximo mes a las 08:00
usa zona local del proceso. Toggle es read/update y no garantiza dos alternancias
concurrentes. Filtros falsy no borran valor previo. JSON SMTP inválido usa defaults;
JSON de reglas inválido falla 500. No hay benchmark ni entrega externa verificada.

## Trazabilidad

[Plan](plan.md), [BDD](behavior.md), [tareas](tasks.md).
Dependencia: 018. Constitución I–V, Node 26 y ratchets existentes.
