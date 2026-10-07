# Plan 017: Reportes de turno

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Estrategia y archivos

1. Inventario PRD/SDD/BDD y tres tests RED.
2. modules/shiftReports/application: list/save y traducción de errores con puertos;
   services/shiftReportFlows.ts compone servicio vigente sin importar HTTP en aplicación.
3. Controller Express delegado, plugin nativo y exportStream con Writable neutral;
   StreamExportService cambia solo tipo de salida y reutiliza algoritmo XLSX.
4. app/runtime/manifiesto/strict/fixtures/guards y pruebas PostgreSQL en ambos transportes.
5. Resultado y docs; gates backend seguidos por frontend tras SDK.

Errores JSON de exporters en PassThrough deben declarar application/json, sin
alterar archivos XLSX exitosos. No buffers completos ni casts a Response. Helper
sendHttpStream compartido cierra errores antes/después de headers sin doble end.
GET legacy query usa z.unknown como marcador y conversiones del servicio, no schema
estricto nuevo. Conservar 200 en POST, MAX numérico/retries, errores y efectos.

## Verificación y rollback

Node 26: backend validate:ci/test:coverage/test:fastify:integration. Luego frontend
validate:ci:coverage. Raíz docs:check/spec:check/secrets:scan y diff. PostgreSQL
18.4 desechable, XLSX leído con ExcelJS, sin servicios externos ni BD local.
Revertir módulo/plugin/entrega sin migración BD; Express principal. Defectos legacy
quedan en spec y pruebas de caracterización para resolver antes de 025.
