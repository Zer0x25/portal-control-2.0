# BDD

- B1: Dado un registro con secretos y columna futura, listado normal/paginado devuelve solo campos públicos y metadata de sync.
- B2: Alta guarda hash bcrypt usable, responde 201 con mustChangePassword y emite el mismo DTO sin credenciales.
- B3: Cambio de contraseña guarda hash nuevo, conserva secreto MFA, responde 200 y emite DTO seguro.
- B4: ensureEmployeeUser crea usuario vinculado y evento seguro; repetir devuelve mismo DTO sin duplicar ni emitir.
- B5: Borrado emite solo id e isDeleted.
- B6: UserSchema acepta DTO público con mfaEnabled/roles normalizados y rechaza passwordHash añadido.
