# SDD

modules/users/application/publicUser.ts expone UserProjection, PublicUser y una
función pura toPublicUser a través de index.ts. No importa Prisma, framework,
entorno ni reloj global. Fechas de entrada se serializan a ISO; no se crea reloj.
UserService usa un select Prisma de nueve campos públicos/de proyección, y nunca
spreads de filas de BD en respuestas o sockets. Solo se permite spread del DTO
y metadata propia. Esto protege también contra doubles que ignoran select.

Campos: id, username, role, employeeId nullable, mustChangePassword, mfaEnabled,
lastLogin nullable, createdAt y updatedAt. Listados añaden syncStatus, isDeleted
y lastModified derivados como antes. Enum OpenAPI incluye las etiquetas con
espacios que el servicio ya devuelve. UserSchema estricto rechaza campos extra;
la protección runtime es el mapper, no una limpieza Zod posterior.

PUT users referencia UpdateUser en su requestBody y User solo en respuesta.
Esto conserva el contrato de contraseña de entrada al cerrar el DTO de salida.

No se toca AuthService: sus consultas internas siguen necesitando passwordHash y
mfaSecret para autenticar. Contraseñas se verifican contra la fila persistida, no
contra DTO. Sockets se comprueban en el límite SocketService.emit; no se arranca
un servidor WebSocket adicional. Se conservan controles Admin de rutas users.
