# Resultado 022: Auditoría

- Fecha: 2026-10-07
- Estado: Implementada y validada localmente
- Spec anterior: 021, commit `6fb3e2b` (hooks aprobados)
- Spec 022: cambios locales sin commit

## Entrega

Seis rutas nativas con aplicación pura compartida Express/Fastify. Consulta,
creación, limpieza, snapshot y verificación usan puertos tipados. SQL de export
parametrizado trasladado a services/auditExport.ts; CSV/XML usa Writable sin
Express.Response. Servicios de auditoría/integridad, transacción directa,
política de retención, renderers y contexto ALS mantienen comportamiento.
Los tipos severity/outcome admiten strings, tal como schema HTTP y columnas BD;
no se añade validación enum ni se transforman datos. Error anterior a bytes usa
AUDIT_EXPORT_ERROR; respuesta de error ya terminada por renderer se considera
comprometida también en el stream nativo, evitando segunda respuesta/auditoría.

## Evidencia

- TDD: cuatro RED con factory pendiente; cuatro GREEN tras implementación.
- Focalizadas finales: 189 pruebas en cuatro archivos, incluidos guards estrictos,
  contrato exacto no vacío, autenticación y marcadores de validación.
- Cobertura backend: 447 pruebas en 51 archivos; ratchets aprobados.
- Integración completa: 441 pruebas en 17 archivos; 46 casos nuevos (23 por
  adaptador) con PostgreSQL 18.4 creado y eliminado por runner propietario.
- Se verificó persistencia real del actor/IP, paginación/cursor, filtros repetidos,
  CSV/XML con escapes y parámetros SQL, limpieza default/string/bounds, cadena
  vacía y registro sin hash, matriz de roles y errores antes/después de bytes.
- Concurrencia: dos peticiones con actores distintos conservaron ALS tras awaits
  y current_setting('audit.username') bajo withDirectTransaction.
- Fallo persistencia manual: 201 sin fila; renderer sin conexión: 500 message-only;
  fecha inválida en cursor: 200 parcial. Deudas heredadas caracterizadas.
- Backend validate:ci final: formato, lint 0/0, tipos global/holidays/modules,
  SDK sin diff, nueve pruebas de schemas y build aprobados.
- Frontend validate:ci:coverage después del backend: 276 pruebas en 71 archivos,
  cobertura, tipos, formato, lint 0/0 y build/PWA aprobados.
- Raíz: docs:check (135 Markdown/19 ADR), spec:check (25 specs), secrets:scan
  (0 secretos/31 entradas permitidas), git diff --check aprobados.

Logs locales: /tmp/portal-022-red.log, /tmp/portal-022-final-focused.log,
/tmp/portal-022-coverage.log, /tmp/portal-022-integration.log,
/tmp/portal-022-backend-final.log, /tmp/portal-022-frontend-ci.log.
La suite completa incluyó los cuatro casos de renderer propios y descarga parcial;
las focalizadas finales comprobaron también el puerto de stream ya terminado.
No se reutilizaron DATABASE_URL/DIRECT_URL locales ni se detuvo la BD del usuario.

## Límites y rollback

Sin migraciones Prisma, dependencias nuevas ni cambios de schema/SDK. Socket se
comprueba con spy, sin clientes reales. No staging, gateway, PgBouncer en tests,
e2e, jobs, benchmark ni cambio de servidor principal. La paridad no corrige los
riesgos detallados en [spec](spec.md): paginación/fechas, esquema manual, éxito
sin persistencia, límites del verificador, snapshot del proceso y streaming parcial.
JSON mantiene tope 10.000 según servicio; no se añadió carga de 10.001 filas.

Revertir 022 completo restaura el controller previo y retira plugin/registro/guard,
sin rollback de BD. Próximo: 023 mantenimiento/administración; luego 024 runtime
y 025 cutover, sujetos a sus propios gates y decisiones de producto.
