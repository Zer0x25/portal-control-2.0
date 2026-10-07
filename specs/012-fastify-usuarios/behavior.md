# BDD

- Dado un JWT vigente cuyo rol Admin se revoca en BD, cuando se usa cualquiera de las cuatro rutas, entonces retorna 403 sin mutación ni evento de usuario.
- Dado un visitante sin token, cuando intenta CRUD, entonces recibe 401 antes de efectos.
- Dado un Admin, cuando crea una cuenta, entonces recibe 201 con rol normalizado, flag de cambio forzado, contraseña persistida usable y DTO/evento sin secretos.
- Dada una contraseña nueva sin override, cuando actualiza, entonces se salda el flag; ambos flags explícitos conservan precedencia del interno.
- Dado un empleado vinculado, cuando se busca por nombre y rol con página, entonces devuelve la cuenta y metadata; al enviar employeeId vacío desconecta la relación.
- Dada una cuenta existente, cuando se duplica username, entonces 409; recursos inexistentes retornan 404 sin eventos.
- Dada una eliminación válida, entonces 204 sin cuerpo, fila eliminada, auditoría con actor y evento tombstone.
- Dadas consultas simples/parciales/paginadas y delta, entonces conservan sus formas y filtro createdAt histórico.
- Dado un fallo del repositorio, entonces no se audita ni emite éxito desde aplicación.
