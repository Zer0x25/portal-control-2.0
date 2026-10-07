# Ausencias: extensión, solapamientos y atomicidad

Corrección funcional posterior al cutover autorizada el 2026-10-07.
La caracterización de 016 conserva el comportamiento histórico.

- Alta y edición requieren fechas reales y startDate <= endDate (400).
  El límite de siete días aplica también a nuevas altas con ID del cliente.
- Otro permiso no eliminado del mismo empleado bloquea cualquier cruce de rangos
  inclusivos, incluso con otro tipo: 409 LEAVE_OVERLAP. La propia ausencia se
  excluye al editar; períodos consecutivos y otros empleados no se bloquean.
- Extender conserva días activos; acortar archiva solo días fuera del nuevo rango
  cuya justificación contiene el ID del permiso y no tienen ninguna de las
  cuatro marcas. Los días del rango se materializan sin dejar tombstones propios.
- Registros archivados manualmente o sin procedencia comprobable no se reactivan.
  Un día autogenerado por un permiso eliminado o que ya no cubre esa fecha puede
  reutilizarse para otro permiso, cargando las referencias por lote.
- Cualquier entrada/colación/salida prevalece sobre materialización y limpieza.
- Alta/edición/eliminación, jornadas, archivo y sellado usan withDirectTransaction.
  Un bloqueo FOR UPDATE de employees serializa los escritores de ausencias del
  empleado; las jornadas existentes se bloquean antes de inspeccionarlas.
  SQL parametrizado, sin variables de sesión sobre PgBouncer.
- Los eventos se emiten después del commit; fallos de escritura o sello revierten
  todos los cambios y no emiten eventos de éxito. Auditoría de triggers comparte
  la transacción; el registro de error HTTP puede persistir por separado.
- Se conservan campos inmutables, permisos HTTP, sobres de respuesta, límites de
  antigüedad y gracia de eliminación. Ausencias eliminadas no se pueden reeditar.

Verificación HTTP/PostgreSQL en Express y Fastify: extensión/acortamiento,
reactivación y hashes, extremos inclusivos, concurrencia, tombstones manuales,
precedencia de las cuatro marcas y rollback por escritura/sello.
No modifica la política de lectura ni repara automáticamente datos históricos.

## Resultado

- Backend validate:ci aprobado, incluido strict, SDK sin cambios y build.
- Cuatro pruebas unitarias de flujos aprobadas.
- docs:check, spec:check y secrets:scan aprobados.
- PostgreSQL desechable: 20 archivos y 557 pruebas aprobadas.
- Frontend validate:ci aprobado: 74 archivos, 279 pruebas y build.
