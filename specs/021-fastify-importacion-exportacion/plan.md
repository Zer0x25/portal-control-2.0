# Plan 021: Importación y exportación

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Implementación

1. Inventario de importRoutes/exportRoutes y ambos schemas; caracterizar límites,
   errores y scopes diferentes de Usuario/quiosco sin corregir contratos legacy.
2. BDD y cuatro tests RED con factories sin implementación; pasar a flujos puros.
3. modules/importExport/application contracts/flows, API index y plugin HTTP nativo;
   services/importWorkbook/importExportFlows compone ExcelJS y renderers existentes.
4. Controllers Express como adaptadores; schema controller se mueve sin cambios a
   models/schemas/exportFilters.schemas.ts. StreamExportService solo tipa sink KPI
   ExcelHttpStream y admite compiled_detailed heredado sin modificar renderer.
5. app conserva presupuesto export compartido 10/15 min antes de auth/maintenance,
   headers draft-7 y 429 message-only. Tests usan IP distinta por caso, sin apagar
   limiters; un caso dedicado agota presupuesto. app/runtime/routeContracts/check:modules y guard arquitectónico incluyen módulo;
   sendHttpStream admite mapper opcional y auditoría compartida para errores
   previos a bytes, sin auditar de nuevo descargas ya iniciadas. Runtime
   registra carga lazy de exporter para cerrar pool también cuando solo se usa 021.
6. tests/fastify-integration/importExport.test.ts sobre PG real/session persistida:
   workbook/PDF/XLSX reales, scopes, 50 MiB, validaciones y fallos inyectados antes
   y después de bytes. Dobles renderer solo para verificar filtros/fallo, no sustituyen
   casos reales. tests/unit/importExportFlows y guards prueban frontera y anti-vacuidad.

## Verificación y rollback

Backend validate:ci, test:coverage, test:fastify:integration (PG18.4 desechable).
Frontend validate:ci:coverage después de backend check:sdk, nunca en paralelo.
Raíz docs:check/spec:check/secrets:scan y git diff --check. Sin nuevos paquetes,
schema Prisma o migraciones. Ratchets no bajan. No staging/carga en esta entrega.
Revertir registro/composición/controladores y módulos; archivos y DB no requieren
transformación. Express principal permite retirar candidato sin cambio de datos.
