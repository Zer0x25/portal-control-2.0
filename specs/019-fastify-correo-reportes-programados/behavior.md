# BDD 019: Correo y reportes programados

Contrato: [spec](spec.md). Ejemplos ejecutados en Express y Fastify.

1. Dada una sesión Admin y BD vacía, GET config devuelve tres perfiles sin contraseña,
   GET rules devuelve reglas desactivadas y GET scheduled-reports devuelve [].
2. Dado solo profiles/activeProfileIndex o solo host/auth/from, guardar SMTP devuelve
   400 sin escribir. Dada su combinación válida, guarda perfiles cifrados y devuelve
   200; lectura enmascara y guardar ******** conserva exactamente el ciphertext.
3. Dado verify inválido, devuelve 400 sin proveedor. Dado verify enmascarado después
   de guardar, transporte recibe contraseña descifrada y TLS estricto. Proveedor
   offline devuelve 200 success:false con mensaje de conexión.
4. Sin SMTP configurado, send-test devuelve 200 success:false sin transporte.
   Con configuración, el doble recibe remitente, destinatario y HTML con saltos br.
   Fallo de proveedor devuelve success:false; destinatario inválido da 400.
   Omitir message caracteriza defaults no aplicados: success:false, sin envío.
5. Reglas nativas solas fallan schema. Body combinado se guarda sin retirar extras;
   leer JSON corrupto devuelve 500.
6. Reporte solo legacy falla schema; solo schema sin cron/frequency falla campos
   requeridos. Body combinado crea 201, ignora createdBy del cliente y persiste
   actor de sesión, filtros JSON y destinatarios separados por coma.
7. Actualizar devuelve destinatarios normalizados y conserva filtros omitidos;
   toggle cambia isActive; delete devuelve 204 vacío y retira registro.
8. ID ausente devuelve 404 en lectura/update/toggle/delete. Update con email inválido
   devuelve 400 antes de DB. Fallo real de insert devuelve 500 sin reporte parcial.
9. Cada una de las doce rutas sin sesión devuelve 401; sesión con rol Supervisor
   devuelve 403 antes de proveedor o escritura. Supervisor_Elevado accede;
   Reloj_Control, Fiscalizador y Usuario se excluyen en ambas familias.

TDD: emailReportFlows.test.ts demostró cuatro fallos con factory sin implementar:
parse/orquestación SMTP, campos/actor, 404/identidad de error, operaciones delegadas.
Las pruebas de integración usan PostgreSQL 18.4 propiedad del script y nodemailer
sustituido completamente. No se realiza entrega externa.
