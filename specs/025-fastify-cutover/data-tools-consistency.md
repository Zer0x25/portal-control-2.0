# Consultas de medidores y mutaciones de notas

Contrato correctivo de la primera [tanda amplia](tandas.md) posterior a 025.

Medidores valida y normaliza toda la query en el flujo compartido. page y pageSize
se envían juntos: enteros positivos, page <= 1000000 y pageSize <= 500. Sin ambos
no hay paginación. Fechas son días reales ISO, años 0001–9998; rangos invertidos,
objetos, meses inválidos y timestamps no finitos/fuera de rango devuelven 400.
since es milisegundos enteros no negativos, hasta 8640000000000000. Notas aplica
la misma validación de delta. Cero es un delta válido. No se cambian schemas
comunes de otros módulos. La aplicación consume puertos de parsing puro y no DB.

month filtra realmente el mes completo de Chile y es excluyente con startDate y
endDate. meterId, since y rango se intersectan; since no amplía un rango. El fin
inclusivo se convierte al primer instante del día siguiente exclusivo. La búsqueda
del inicio de día resuelve medianoche inexistente de DST sin retroceder al día
anterior; no depende del TZ del host. Orden de lectura timestamp DESC, id DESC
hace estable la paginación cuando coinciden timestamps. No hay snapshot entre
páginas frente a nuevas inserciones; no se añade cursor en esta tanda.

Notas conserva permisos y DTO, defaults, creación 201, archivo y borrado existentes.
El authorUsername legacy del body sigue requerido pero se ignora, como medidores:
el username de sesión define autoría y auditoría. Crear/archivar/eliminar nota y
su auditoría QUICKNOTE_CREATE/UPDATE/DELETE comparten withDirectTransaction.
Fallo de auditoría revierte la mutación; eventos ocurren después del commit.
No se reescriben autores históricos ni se añade ownership nuevo de notas.

Pruebas de paridad cubren límites a ambos lados del día normal y DST, hosts UTC y
Santiago, intersección de delta, queries inválidas, mes efectivo, autor falsificado,
fallos de auditoría de las tres mutaciones y formatos/eventos existentes. OpenAPI
y SDK reflejan los cambios de consulta. El backlog y la lista se actualizan al cierre.
