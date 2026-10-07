# BDD 016

1. Supervisor crea permiso hoy→mañana: 201, dos jornadas materializadas sin marcaciones,
   selladas; una jornada con entrada previa conserva estado y horario.
2. Extiende fecha final sin cambiar empleado/tipo/inicio: limpia filas sin marcación
   y rematerializa conservando defecto legacy: las filas archivadas no se reactivan. DELETE acorta a ayer, soft-delete y limpia solo futuras sin entrada.
3. Más de siete días, edición finalizada/campos inmutables/fin pasado y archivo sin
   gracia devuelven 400; ausencia inexistente 404.
4. Usuario no puede acceder a leaves; Reloj_Control sí, pero no resolver correcciones.
   JWT Admin con rol persistido Usuario no supera roles protegidos.
5. Solicitud con requestedValue ambiguo recibe 400 sin writes; Usuario ajeno 403
   solo message; propia 201. List/stats/history respetan vínculo vigente.
6. Rechazo sin motivo 400; rechazo válido persiste motivo/actor, no cambia marcación;
   repetición devuelve entidad resuelta sin emitir ni auditar otra vez.
7. Cinco aprobaciones simultáneas: todas 200, un parche/auditoría/eventos de ganador.
   Fallo del update del registro revierte estado pending sin emitir eventos de éxito.
8. Historial usa auditoría y fallback cuando no hay logs; ajeno 403, inexistente 404.
9. Filtros since/showArchived/paginación conservan tombstones y envelopes.
10. Se caracteriza solapamiento de permisos permitido: no hay regla de conflicto nueva.
11. Cuerpos mayores a 1 MiB se rechazan antes de ejecutar efectos.
