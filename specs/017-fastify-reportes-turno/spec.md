# Spec 017: Reportes de turno

- Estado: Implementado y validado localmente
- Fecha: 2026-10-06
- Ruta: [roadmap](../roadmap-fastify.md)

## Problema y alcance

Tres rutas /api/shift-reports necesitan HTTP nativo Fastify y orquestación
compartida con Express. Crear módulo shiftReports puro con puertos y salidas
inferidas; conservar ShiftReportService y normalización/auditoría/eventos.

| Método | Ruta                          | Validación / respuesta                              |
| ------ | ----------------------------- | --------------------------------------------------- |
| GET    | /api/shift-reports            | Query legacy manual, 200 data/total/page/totalPages |
| POST   | /api/shift-reports            | ShiftReportSchema sin reemplazar body, 200 entidad  |
| GET    | /api/shift-reports/export/:id | Params string, stream XLSX; 404 message             |

Todas requieren sesión y rol persistido Administrador/Supervisor_Elevado/
Supervisor/Reloj_Control. Límite global 1 MiB. Exportación pasa Writable neutral,
sin casts Express.Response ni buffer de archivo completo en producción.

## Criterios de aceptación

- [x] AC1: Manifiesto exacto no vacío de tres rutas, auth/roles/validación/status/headers conservados.
- [x] AC2: BDD concreto y tres pruebas RED antes de implementar; después GREEN.
- [x] AC3: Aplicación strict/pura, puertos tipados y API pública index.ts; controllers delgados.
- [x] AC4: Paridad PostgreSQL para ciclo de vida/folio/normalización/auditoría/eventos/conflicto y XLSX real; permisos persistidos y fallos sin colgar.
- [x] AC5: Gates backend/frontend secuenciales, SDK/docs/secrets/specs/ratchets, resultado y rollback.

## Invariantes y límites

Folio usa MAX numérico y retry P2002, no orden lexicográfico. Nuevos ignorarán
folio aportado pero updates pueden modificarlo, como contrato vigente. Conflicto
409 traduce SHIFT_START_BLOCKED con responsable/folio; otros errores de guardado
se envuelven en 500 SHIFT_REPORT_ERROR. Auditoría conserva actor real aunque
responsibleUser sea dato del cliente. Entradas se normalizan/ordenan en servicio.

Deudas: schema permite id ausente, servicio hace findUnique con id undefined y
falla 500. Lookup de turno abierto incluye soft-deleted y no está transaccionado;
no garantiza un único abierto concurrente. Updates permiten reabrir sin revisar
conflicto y audit de entradas ocurre antes de write no atómico. List since conserva
abiertos pero excluye tombstones. Exportación usa JSON almacenado directo, por lo
que JSON legacy corrupto falla aunque list normalice. Conservar y caracterizar,
sin correcciones silenciosas. Helpers AppError/toCaughtError puros permitidos.

Express principal; sin schema/deps/SDK nuevos, DB local, despliegue, staging,
listeners/jobs/sockets o promesa de rendimiento.

## Trazabilidad

shiftReportFlows.test.ts RED/GREEN; shiftReports.test.ts PostgreSQL; límites de
HTTP/manifiesto/strict/imports. Dependencia real: base auth y stream de 014.
