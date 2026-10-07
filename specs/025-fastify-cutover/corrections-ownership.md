# Correcciones: pertenencia de empleado y jornada

Corrección funcional posterior al cutover, autorizada el 2026-10-07.
La caracterización histórica de 016 describe el comportamiento previo.

- Usuario sin employeeId recibe 403 al listar (incluidos deltas), consultar
  estadísticas o historial, incluso para un ID inexistente. Crear conserva el
  403 y payload existente de ownership.
- Usuario vinculado conserva filtros propios y 403 para historial ajeno.
- Toda creación exige una jornada existente (404 TIME_RECORD_NOT_FOUND) que
  pertenezca al employeeId declarado (403 FORBIDDEN), también para Administrador.
- Aprobar una solicitud histórica inconsistente devuelve 403 y revierte el claim
  pending dentro de withDirectTransaction. No modifica jornada ni emite eventos
  o auditorías de éxito. Rechazar sigue disponible para resolver esas solicitudes.
- Roles administrativos conservan lecturas globales. Scope quiosco y assignments
  se resuelven después en [self-only-scope](self-only-scope.md).

Verificación: tests PostgreSQL/HTTP para Express y Fastify en
backend/tests/fastify-integration/leavesCorrections.test.ts, incluidos acceso
cruzado, usuario desvinculado, jornada inexistente y rollback de aprobación.

## Resultado

- Backend validate:ci aprobado, incluidos strict, SDK, lint cero y build.
- Suite PostgreSQL desechable: 20 archivos y 529 pruebas aprobadas.
- Flujos unitarios leaveCorrectionFlows: cuatro pruebas aprobadas.
- docs:check aprobado.
- Frontend validate:ci aprobado: 74 archivos, 279 pruebas y build.
