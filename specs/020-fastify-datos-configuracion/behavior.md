# BDD 020: Medidores, notas y configuración

Contrato: [spec](spec.md). Cada escenario de paridad se ejecuta en ambos servidores.

1. Crear dos lecturas válidas devuelve 201 con sync metadata y un meter:updated
   count=2. IDs/timestamp del cliente no se persisten; notas vacías son null.
2. La lectura 51 inválida hace que el lote entero devuelva 400 sin inserts ni
   eventos. Lote vacío permanece permitido, count=0. Paginación agrega únicamente
   total/page/totalPages; meterId/rango/since filtran, month no filtra. En Chile, rango 2026-01-02 al mismo día excluye lectura
   12:00Z por mezcla UTC/local; rango amplio incluye ambas.
3. Nota con isArchived=true/id externos crea una nota nueva no archivada;
   authorUsername del cliente se conserva y color vacío/reminder omitido usan defaults.
   Archive devuelve raw note y socket sync metadata; list incluye archivadas.
   Delete devuelve mensaje y evento con id. IDs ausentes: 404; contenido vacío: 400.
4. Configs Admin lista claves protegidas; rol persistido Usuario las excluye y GET
   de esas keys devuelve 403, pero otras claves siguen disponibles. JSON escalar
   y null se serializan como JSON. Hora informa zona America/Santiago.
5. Guardar value JSON usa actor de sesión, genera CONFIG_SET y config:updated.
   Supervisor_Elevado no puede escribir configs ni validar cierre.
6. Anomalía real de jornada bloquea cierre: validate devuelve allowed=false con
   details; set devuelve LOCK_DATE_BLOCKED 400 sin modificar lock/audit/eventos.
   Cierre permitido se persiste; fecha futura conserva 500 y no reemplaza lock.
7. Sin policy, lectura anónima y descarga dan 404 con message. Admin sube PDF 201;
   lectura pública devuelve metadata/url y descarga bytes PDF inline, Range 206 y If-None-Match 304. Reemplazo
   elimina anterior; si archivo actual desaparece, descarga devuelve 404.
8. Falta file/MIME incorrecto/campo inesperado dan 400; superar 15 MiB da 413 y
   no escribe metadata. Metadata con ../../filename solo resuelve basename local.
9. Falla real de update DB deja valor previo y no publica evento ni CONFIG_SET.
   Sesión ausente da 401 en las doce rutas protegidas; Usuario no realiza mutaciones.
   Reloj_Control puede crear medidores/notas y no escribir configuración.

TDD: dataConfigFlows.test.ts demostró cuatro fallos con factories stub antes de
implementar: paginación/lote entero, proyección notas/id, traducciones de error,
y orden guardar metadata antes de borrar archivo anterior con reloj inyectado.
No se modifican BD del entorno; los tests de archivo crean y limpian solo archivos
propios en uploads/company-policy, dejando intactos los archivos existentes.
