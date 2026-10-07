# Consistencia de lotes de medidores

Contrato correctivo posterior a [025](spec.md), para la deuda de 020.

POST `/api/meters/bulk` conserva roles, colección completa validada, respuesta 201,
orden de entrada, defaults y campos de sincronización. Se siguen ignorando id,
timestamp y campos de sincronización enviados por el cliente. `authorUsername`
permanece requerido en el schema legacy para preservar DTO/SDK, pero su contenido
se ignora: todas las lecturas reciben el username de la sesión autenticada.
El flujo y servicio exigen actor explícito, sin fallback a una identidad cliente.

Una sola `withDirectTransaction` inserta el lote y sus auditorías. Inserciones y
auditorías usan operaciones batch; UUID generados por servidor permiten reconstruir
el orden de entrada sin depender del orden de SQL RETURNING. Se conserva una
entrada `METERREADING_CREATE` por lectura, con actor de sesión e id de la lectura.
Un fallo de inserción o auditoría revierte todo. No hay writes ni eventos parciales.
Los eventos de auditoría y el único `meter:updated` ocurren después del commit.
El lote vacío sigue aceptado y emite count 0; no crea filas ni auditorías.

Integración Express/Fastify cubre autoría falsificada en distintas filas, orden,
campos ignorados, auditorías, validación del elemento 51, lote vacío, fallo en una
inserción intermedia y fallo de auditoría después de insertar el lote. Se mantienen
permisos existentes. No hay cambios de fechas/filtros de lectura ni deduplicación:
reintentar un lote exitoso sigue creando nuevas lecturas. Esas deudas se tratan
separadamente; no se introduce clave idempotente ni un nuevo formato HTTP.
