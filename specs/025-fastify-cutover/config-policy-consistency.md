# Configuración y reglamento: consistencia

Contrato correctivo posterior a [025](spec.md), dentro de la segunda
[tanda](tandas.md) y el [backlog](backlog.md).

## Persistencia y auditoría

ConfigService confirma el upsert y CONFIG_SET en una sola withDirectTransaction.
Una falla de auditoría revierte la configuración; los eventos se emiten después
del commit. Un advisory lock por clave serializa también la creación inicial y
permite auditar el valor anterior confirmado. Se conserva la redacción completa
de SMTP_CONFIG y EMAIL_NOTIFICATION_RULES, el enmascarado HTTP y los permisos.

La validación previa del cierre contable conserva su comportamiento: esta tanda
no agrega un bloqueo de las escrituras de jornadas durante la validación.

## Archivo PDF

Ambos adaptadores llaman al mismo puerto de validación después de almacenar el
archivo y antes de publicar metadata. Se verifica MIME, tamaño real y máximo
15 MiB, cabecera y terminador PDF. Además se carga el documento con
[pdf-lib](https://pdf-lib.js.org/docs/api/classes/pdfdocument#load), rechazando
objetos inválidos, documentos sin páginas o que requieren contraseña.
No se reescribe el archivo: descarga, Range y ETag conservan sus bytes.

La validación estructural no certifica seguridad del contenido ni conformidad
PDF/A. El parser procesa hasta 15 MiB en memoria; no se introduce un escáner.

El puerto replacePolicy devuelve el valor anterior desde la transacción que
confirma el reemplazo. Así, dos uploads concurrentes limpian sucesivamente los
archivos sustituidos y conservan el vigente. Si validación o persistencia fallan,
se elimina el archivo nuevo y se conserva el anterior.

La limpieza ignora ENOENT y registra otros fallos de filesystem. Un crash del
proceso entre guardar el archivo y confirmar metadata, o entre commit y unlink,
aún puede dejar huérfanos: no hay transacción distribuida filesystem/PostgreSQL
ni barrido automático de archivos históricos.

## Verificación

Pruebas compartidas Express/Fastify: rollback de CONFIG_SET, PDF falso/truncado,
limpieza al fallar persistencia y reemplazos concurrentes. La prueba de descarga
usa ahora un PDF con estructura real. Las unitarias verifican orden del reemplazo
y limpieza de la carga fallida.

Cierre: 651 pruebas de integración en 20 archivos, 6 unitarias de flujos,
279 frontend; validate:ci de ambos paquetes, SDK, docs:check, spec:check y
secrets:scan correctos. Sin migración de base de datos.
