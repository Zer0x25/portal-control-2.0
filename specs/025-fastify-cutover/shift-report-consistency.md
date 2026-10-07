# Consistencia de reportes de turno

Contrato correctivo posterior a [025](spec.md), para la deuda de 017.

- Crear sin id genera el identificador de Prisma.
- Un reporte abierto eliminado no bloquea una apertura.
- Crear y actualizar comparten un advisory lock transaccional de PostgreSQL
  mediante `withDirectTransaction`. Abrir o reabrir devuelve el conflicto 409
  existente cuando otro reporte activo está abierto.
- La asignación conserva MAX numérico y el formato mínimo de tres dígitos.
  El bloqueo serializa la asignación y reemplaza el retry de colisiones entre
  escritores de este servicio. Escritores externos deben respetar el mismo lock.
- Reporte y auditorías de éxito se confirman o revierten juntos. Un fallo de
  auditoría ahora impide confirmar el reporte. Eventos se emiten tras commit.
  La auditoría de apertura bloqueada se conserva fuera de la transacción.

Pruebas compartidas Express/Fastify cubren id generado, eliminados, cinco
aperturas simultáneas, reapertura, folios concurrentes y rollback por fallo de
escritura o auditoría. La exportación de JSON legacy corrupto, paginación,
fechas del host y la consistencia del motor KPI siguen pendientes.
