# Consistencia de backup y restore

Cuarto bloque de la [tanda 5](tandas.md), posterior al
[retiro de Express](express-retirement.md). Fastify es el único servidor HTTP.

## Contrato correctivo

- Restore ejecuta el reemplazo de `public` y el SQL en una única invocación de
  `psql --single-transaction --set=ON_ERROR_STOP=on --no-psqlrc`. Un error SQL
  posterior a DDL/data revierte también el borrado inicial del esquema. El
  proceso termina con error y la fachada no anuncia éxito.
- El formato soportado sigue siendo el dump SQL de `pg_dump` del servicio,
  opcionalmente gzip. No se soportan scripts arbitrarios con `COMMIT`, cambios
  de conexión o instrucciones incompatibles con transacciones.
- Cada restore posee un directorio temporal independiente. Descomprimir no
  sobrescribe un `.sql` vecino; el temporal se elimina también cuando falla gzip
  o `psql`.
- Backup escribe y comprime en un directorio de trabajo dentro de BACKUP_PATH.
  Solo publica con rename después de verificar integridad. Un fallo de dump o
  verificación elimina el trabajo y no deja un respaldo parcial visible.
- Un fallo de retención se registra, pero conserva el respaldo verificado y
  permite informar éxito. No cambia la política ni sus límites.
- El modo Docker usa el contenedor explícito o exige un único contenedor
  PostgreSQL 18.4-alpine. No selecciona silenciosamente el primero cuando hay
  varios. Los logs del servicio usan el logger estructurado.

## Verificación

El harness crea PostgreSQL 18.4 desechable y proporciona su identidad a las
pruebas. `backup-restore.test.ts` crea una segunda base dentro de ese contenedor;
restaurarla no modifica la base del resto de la suite ni utiliza URLs del usuario.
Comprueba dump/restauración real, rollback tras error SQL después de DDL/data,
gzip válido/corrupto, preservación del archivo vecino, limpieza de temporales,
fallo real de pg_dump y respaldo comprimido recuperable pese a fallo de retención.

Validación del bloque: 391 pruebas de integración nativa, 562 unitarias/contrato
y 280 frontend; CI y cobertura de ambos paquetes, SDK, docs, specs y secretos
correctos. Presupuestos sin cambios.

## Límites pendientes

La atomicidad de restore no es una barrera distribuida: no coordina todas las
peticiones/jobs de otros procesos, no conserva locks ubicados en `public` después
de una restauración exitosa y no resuelve la recuperación tras caída del motor.
La barrera universal HTTP/jobs, reset/restore entre procesos y exclusión de
reportes manuales/ocurrencias distintas siguen en el [backlog](backlog.md).
No se aplican migraciones ni restauraciones a bases del usuario.
