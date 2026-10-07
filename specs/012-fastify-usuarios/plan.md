# SDD

## Contrato y límites

modules/users/application/flows.ts contiene list/create/update/delete y tipos de
entrada/repositorio; publicUser.ts sigue como lista positiva de campos públicos.
No importa framework, Prisma, DB, entorno, red ni reloj global. Dependencias:
repository, hash, id, audit y emit. El repositorio devuelve UserProjection;
aplicación construye DTO público, metadata de sincronización y tombstone.

UserService conserva su API como fachada de los flujos e implementación Prisma:
select positivo, consultas batched findMany/count, relaciones y cliente extendido.
ensureEmployeeUser y forceResetPassword permanecen en infraestructura por su
vínculo con empleados y administración; ensure conserva el DbClient transaccional.
Los flujos normalizan username/rol, hash, precedencia de flags de contraseña y
orden persistencia → auditoría → evento. No se introduce atomicidad entre estos
pasos ni nuevas transacciones. Se conserva el audit updatedFields con employee.

HTTP Fastify registra rutas nativas con auth antes de parsear cuerpo y permisos
Admin antes de efectos. Usa los mismos schemas Zod de entrada y UserSchema de
salida. Los validadores de entrada comprueban sin reemplazar el cuerpo, igual
que Express: conservar id y flags históricos reconocidos por el servicio aunque
no estén documentados en los schemas. Campos ajenos son ignorados por los flujos.
DELETE valida params e ignora JSON como Express. GET convierte strings numéricos
y conserva respuesta simple o paginada. El guard exige exactamente cuatro rutas,
autenticación y validadores incluyendo query de GET y params de DELETE.

## Invariantes

Nunca exponer passwordHash/mfaSecret/presupuesto MFA en HTTP ni user:updated.
Ningún evento de éxito tras error de persistencia. Roles se consultan en BD,
no se confía en el claim del JWT. Conserva credenciales guardadas y secreto MFA.
Contraseña nueva salda mustChangePassword salvo override explícito; flag interno
prevalece cuando se envían ambos, como antes. Borrado emite solo id/isDeleted.

## Fuera de alcance

Sin cutover, listener WebSocket, jobs, cambios de schema/dependencias, migración
empleados ni benchmark de rendimiento. Filtro delta histórico usa createdAt;
numericString permite NaN/valores no positivos: se documentan para otro cambio,
no se corrigen silenciosamente durante migración. OpenAPI sigue siendo el contrato
existente de Express. Staging/PgBouncer y e2e completos quedan para cutover.
