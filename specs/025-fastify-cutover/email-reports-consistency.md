# Correo y reportes programados: contrato correctivo

Tercera [tanda](tandas.md) del [backlog](backlog.md), posterior a [025](spec.md).
Sustituye las caracterizaciones de deuda de [019](../019-fastify-correo-reportes-programados/behavior.md).

## Contratos compartidos

SMTP recibe profiles (tres perfiles) y activeProfileIndex entero 0–2, como el
frontend. Port es entero 1–65535. Los slots inactivos admiten remitente vacío;
el perfil activo con host requiere remitente válido. Los tres slots vacíos
permiten desconfigurar correo. Verify requiere host y remitente válidos.
Objetos y perfiles rechazan extras; el shape obsoleto host/auth/from no se mezcla
con el contrato nativo.

Reglas usa autoCloseShift, latenessOver15 y latenessOver60, con enabled y recipient.
Una regla activa requiere email; una inactiva admite vacío. Se rechazan extras.
Send-test valida y aplica subject/message vacíos por defecto antes del proveedor.
No cambia success/message ni HTTP 200 para resultado negativo del proveedor.

Reportes usa name, description, reportType, frequency, cronExpression, recipients,
filters e isActive. ReportType acepta los siete renderers existentes; shift_report
requiere filters.shiftReportId. Recipients es un array no vacío de emails.
Filters admite solo campos del exportador, fechas reales y rango ordenado.
CreatedBy viene de sesión; intentos de enviarlo como extra se rechazan.

Crear aplica isActive=true por defecto. Actualizar no aplica defaults de creación:
omite campos sin sobrescribirlos y permite filters=null para limpiar. OpenAPI
distingue inputs de creación/actualización y respuesta, incluyendo listado directo.
No traduce los antiguos type/active/config ni acepta cuerpos combinados.

## Credenciales, estado y auditoría

Lecturas SMTP clonan defaults, admiten el formato single-profile histórico y
enmascaran sin mutar el estado compartido. JSON/shape corrupto devuelve defaults
sin credenciales; reglas corruptas devuelven todas las notificaciones desactivadas.
No se reescriben históricos automáticamente.

Guardar SMTP cifra credenciales nuevas y conserva ******** solo para destino
idéntico. La lectura y conservación de la contraseña ocurre dentro del advisory
lock de configuración, compartido con el endpoint genérico. Guardar reglas usa
la misma persistencia auditada. CONFIG_SET conserva redacción de secretos y actor
de sesión; fallo de auditoría revierte el cambio.

Crear, actualizar, toggle y borrar reportes confirman auditoría con el cambio
en withDirectTransaction. Update/toggle/delete bloquean la fila antes de modificarla.
Toggles concurrentes conservan cada alternancia; updates de campos independientes
no se pisan. Al reactivar se calcula próxima ejecución. No cambian roles: solo
Administrador/Supervisor_Elevado.

## Cron y ejecución

Un helper común usa [cron-parser](https://github.com/harrisiirak/cron-parser)
con reloj explícito y America/Santiago para validar, persistir y programar.
Se admiten cinco campos, listas, rangos, pasos y nombres de mes/día; se rechazan
expresiones imposibles, macros, segundos y valores aleatorios H. Frequency es
etiqueta; cronExpression determina el horario. Se conserva semántica del parser
cuando se especifican simultáneamente día del mes y día de semana.

El runtime usa nextRunAt y timers de una ejecución, recalculando por cron;
no usa intervalos de 24/7/30 días. Esperas mayores al límite de Node se dividen
sin adelantar ejecución. Ediciones refrescan timers únicamente si el scheduler
ya está inicializado: fábricas HTTP no inician jobs. Cron histórico inválido se
registra y se omite sin impedir otros jobs.

La ejecución conserva texto como .txt y PDF real como .pdf, con MIME correspondiente
y fecha de Chile. Los cuatro renderers createSimplePDF aún generan texto y
se convertirán en la tanda 4. Un resultado negativo del
proveedor es fallo; lastRunAt solo cambia después de entregas exitosas. El fallo
avanza nextRunAt al siguiente cron y no hace retry inmediato. Un update condicional
evita sobrescribir el horario de una edición concurrente. Trigger manual devuelve
success:false con mensaje neutral si la ejecución falla.

## Límites pendientes

La exclusión de ejecución es local al proceso: locks/claims entre instancias
quedan en la tanda 5. No hay outbox ni garantía de entrega exactamente una vez:
fallo parcial entre destinatarios o crash tras enviar puede producir entrega
incompleta o duplicada. Desactivar un reporte no cancela un proveedor ya en vuelo.
Esta tanda cambia cron de reportes; mantenimiento nocturno conserva su calendario.

Las fechas/mapping/layout de exportadores permanecen en la tanda 4. Los datos
históricos siguen disponibles; un cron inválido requiere corregirlo para activarse.
No hay migración de base de datos ni entrega SMTP externa durante las pruebas.

## Verificación

Paridad HTTP en PostgreSQL desechable con nodemailer sustituido: contrato nativo,
rechazo de extras, defaults, cifrado/masking, slots vacíos, rollback de auditoría,
actualizaciones parciales, toggles y credenciales concurrentes. Unitarias con
reloj y timers falsos verifican DST, misma jornada, calendarios mensuales, límite
de timers, refresh, fallo de entrega y scheduler frío.

Cierre: 707 pruebas de integración en 20 archivos, 39 unitarias/de contrato y
279 frontend. validate:ci de ambos paquetes, SDK, docs:check, spec:check y
secrets:scan correctos. Se añadieron cron-parser y su dependencia al lockfile;
no cambió el schema Prisma.

Tanda 4 convirtió esos cuatro renderers a PDF real: [importación/exportación](import-export-consistency.md).
