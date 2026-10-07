# BDD 017

1. Supervisor crea turno con id: 200, folio calculado, datos normalizados/ordenados,
   audit SHIFT_STARTED con actor real y evento shiftReport:created enriquecido.
2. Turno abierto impide otro create: 409 con responsable/folio, audit de bloqueo,
   sin nuevo reporte ni evento created.
3. Actualiza novedades/proveedores, conserva audit granular de add/edit/delete;
   cierre emite updated y SHIFT_CLOSED, siguiente turno recibe siguiente folio.
4. MAX numérico tras 999 y 1000 produce 1001; concurrentes closed conservan folios
   únicos vía retry sin afirmar exclusividad de turnos open.
5. List filtra status/paginación/since y mantiene open incluso anterior al delta;
   ignora soft-delete, normaliza JSON legado inválido a arrays vacíos.
6. XLSX contiene novedades/proveedores con headers/filename correctos y se abre
   para verificar celdas. Inexistente devuelve 404 JSON; corrupto 500 sin colgar.
7. Token ausente 401, JWT Admin con rol persistido Usuario 403, Reloj_Control permitido.
   Cuerpo inválido 400, mayor a 1 MiB 413 antes de efectos.
8. ID ausente permanece 500 y abierto soft-deleted sigue bloqueando create:
   caracterización explícita de deuda heredada.
