# Alcance propio de assignments y correcciones

Corrección funcional posterior al cutover, autorizada el 2026-10-07 como
continuación de corrections-ownership. Extiende la política existente del
calendario y matriz a las lecturas de assignments y correcciones.

- Usuario y Kiosk_Employee requieren employeeId del principal autenticado.
  Sin vínculo reciben 403, aunque envíen employeeId en la query.
- Assignments ignora employeeId del cliente para esos roles y fuerza el del
  principal. Conserva paginación, filtros temporales, archivo y deltas.
- Quiosco solo consulta list/stats/history de sus propias correcciones y crea
  solicitudes para su empleado y jornada. Conserva el payload 403 de creación.
- Roles administrativos conservan acceso global y filtros explícitos.
- No amplía permisos de escritura de assignments ni resolución de correcciones.
- Quiosco conserva autenticación JWT sin ActiveSession y TTL vigente.

Pruebas de flujos verifican denegación antes de invocar el servicio. Pruebas
PostgreSQL/HTTP de shifts y leavesCorrections ejercitan Express y Fastify con
JWT de quiosco, acceso cruzado, deltas, vínculo ausente y creación propia/ajena.

## Resultado

- Backend y frontend validate:ci aprobados; SDK sin cambios.
- PostgreSQL desechable: 20 archivos y 533 pruebas aprobadas.
- Flujos unitarios: 11 pruebas aprobadas.
- Lint en ambos paquetes: cero warnings y errores.
- docs:check, spec:check y secrets:scan aprobados.
