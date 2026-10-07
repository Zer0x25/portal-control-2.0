# Barrera de trabajo y coordinación distribuida

Cierre de los tres bloques restantes de la [tanda 5](tandas.md), exclusivamente
sobre Fastify. Continúa el [drenaje administrativo](admin-operation-drain.md) y la
[consistencia de backup/restore](backup-restore-consistency.md).

## Propiedad del trabajo HTTP y cierre

Fastify registra trabajo desde onRequest y conserva un propietario del transporte
hasta onResponse/abort/close. Autenticación, handlers y auditoría de errores poseen
referencias adicionales: finalizar o desconectar la respuesta solo libera el
transporte. Una escritura o auditoría posterior a la respuesta sigue retenida.
El cierre rechaza nuevas peticiones, cierra la admisión del coordinador y espera
el trabajo HTTP real antes de parar jobs/sockets; después espera workers,
notificaciones y permisos restantes antes de cerrar exportadores y pools.

El presupuesto por IP se aplica antes de solicitar el permiso distribuido y
antes de autenticar. La admisión del permiso precede a toda autenticación que
consulta o modifica sesiones, incluidos los hooks encapsulados de feriados.
Actualización lastActive, auditoría de export y auditoría automática de Prisma
pertenecen a la promesa que las inició. Las notificaciones de atraso conservan
propiedad sin retrasar la respuesta de marcación. Health y documentación siguen
accesibles en mantenimiento y solo hacen lecturas; sus errores no escriben
nuevas auditorías de negocio.

## Permisos persistentes

La migración `20261007220000_runtime_coordination` crea `portal_runtime` fuera de
`public`, con permisos, una barrera de mantenimiento y locks por clave. Cada
proceso y cada permiso tienen UUID propios. La admisión usa FOR SHARE y el claim
usa FOR UPDATE sobre la misma barrera, en transacciones directas; una carrera no
puede admitir trabajo después del claim. No se mantiene una transacción ni una
conexión reservada mientras corre un motor externo o se espera drenaje.

Todos los productores del runtime participan: HTTP, runtimeJobs, scheduler,
reportes manuales/automáticos, workers de fase 2 y autenticación/validación por
lotes de sockets. Los hijos que sobreviven a su promesa padre conservan el
permiso hasta que su trabajo termina. Fase 2 retiene también el lock mientras
existan motores de días aún vivos después de un timeout.

Mantenimiento cierra la admisión en todos los procesos y espera permisos previos,
exceptuando su propio request. Solo entonces empieza reset/restore/seed/backup.
El drenaje previo tiene un límite de diez segundos: si hay trabajo pendiente,
devuelve conflicto sin iniciar el motor destructivo, libera la barrera y conserva
los permisos de ese trabajo. No cancela ni declara terminado un motor por timeout.
Durante mantenimiento, tráfico de negocio recibe 503 y admin/maintenance 409;
health conserva su excepción. Los permisos y límites de roles permanecen iguales.

Restore mantiene la barrera hasta terminar revocación y auditoría. Si el SQL ya
se confirmó y falla una etapa posterior, conserva el claim persistente, no
anuncia éxito ni programa restart. El operador debe resolver el fallo y recuperar
con todos los motores detenidos. Un restore SQL fallido revierte y libera la
barrera normalmente.

## Exclusión de reportes y jobs

Los locks no expiran. Reportes automáticos y manuales comparten `report:ID` desde
antes de leer la ocurrencia hasta finalizar renderer/proveedor/persistencia.
Distintas ocurrencias y cambios de cron no permiten solapar el mismo reporte.
Una automática pierde el claim y sale sin render/envío; la ejecución manual
conserva el resultado de error del trigger HTTP existente. Se conserva además
el CAS de nextRunAt y la protección ante ediciones concurrentes.

Los jobs recurrentes y workers de seed usan la misma propiedad persistente.
Se elimina el robo por TTL y el uso de db_instance_id como identidad de mutex;
la huella de base sigue validándose antes de iniciar jobs. Esto garantiza
exclusión de motores, no entrega SMTP exactamente una vez ni retry automático
tras entregas parciales.

## Backup, migración y recuperación

pg_dump excluye `portal_runtime`. Restore solo reemplaza `public`, y reset conserva
el esquema de coordinación. Los respaldos no pueden traer claims antiguos ni
borrar los actuales. La migración es idempotente y no reinicializa una barrera ya
existente, también al aplicar migraciones después de restaurar un historial viejo.

Esta versión requiere **detener todos los runtimes anteriores**, aplicar
`npm run db:migrate:deploy` y arrancar la nueva versión. No admite una mezcla de
versiones que no participen en la barrera. No se aplicó a bases del usuario.
Los respaldos deben ser compatibles con el esquema de negocio de la versión;
para respaldos antiguos, completar las migraciones con el runtime detenido.

Los claims no se eliminan por reloj, reinicio, conexión perdida ni supuesto de que
un proceso murió. Así, una caída puede dejar mantenimiento o un reporte bloqueado
hasta recuperación explícita. Esto evita solapar un psql/pg_dump aún vivo.

Desde backend, inspeccionar sin mutar:

```bash
npm run runtime:coordination -- --status
```

Para recuperar, **detener todos los procesos del runtime y todos los motores
externos de backup/restore/seed**, resolver el fallo original y luego ejecutar:

```bash
npm run runtime:coordination -- --recover --confirm-all-runtimes-stopped
```

El comando limpia permisos/locks/barrera en una transacción; no borra datos de
negocio. No se ejecuta automáticamente. Los clientes SQL y scripts ajenos al
runtime deben permanecer detenidos durante mantenimiento; no participan en esta
barrera de aplicación.

## Evidencia

Las pruebas usan PostgreSQL 18.4 desechable y procesos Node reales. Cubren cierre
HTTP después de respuesta, desconexión y fallo tardío; escritura/auditoría antes
de cerrar pools; cierre de admisión y espera desde otro proceso; permiso persistente
tras SIGKILL; timeout sin motor destructivo; referencias de hijos; procesos de
reporte simultáneos/manuales/ocurrencias distintas; crash y recuperación explícita.
Backup/restore real comprueba que el esquema de coordinación no se restaura ni
se elimina. Los tests nativos de reset/restore mantienen actor, atomicidad,
revocación, límites y stream, y cubren fallo de revocación después de restore.

Validación final: 570 pruebas unitarias/contrato con cobertura y 402 pruebas
HTTP/integración nativa, todas correctas; CI backend incluye strict, lint,
formato, SDK/OpenAPI y build. La carga autenticada paginada se repitió en tres
procesos independientes contra PostgreSQL desechable, con 600 solicitudes por
ronda y concurrencia 16: 209/223/209 solicitudes por segundo y p95
103/88/103 ms, sin errores. Son mediciones de este entorno directo, sin PgBouncer,
no un presupuesto de producción ni una comparación causal con versiones previas.

Frontend: CI con cobertura y build correcto, 280 pruebas. Documentación, specs,
scanner de secretos y presupuestos de lint de ambos paquetes correctos.
