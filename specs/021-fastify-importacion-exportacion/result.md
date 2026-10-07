# Resultado 021: Importación y exportación

Spec: [spec.md](spec.md). BDD: [behavior.md](behavior.md).
Dependencia 020 confirmada en commit 64ba38b. Entrega 021 todavía sin commit.

## Entrega

- Un módulo con API pública index.ts, aplicación pura, puertos de decode,
  validación y renderers. Cinco rutas nativas comparten flujos Express/Fastify.
- Preview real Excel conserva primera hoja, filas, mapping, zero/false/null y
  valores complejos; único cast ambient Buffer de ExcelJS se mueve a decoder.
- PDF mantiene buffer y headers/nombres. XLSX mantiene Writable sin Response cast;
  firma de streamKpiReportToExcel se estrecha al puerto y admite modo heredado.
- Presupuesto export compartido 10 solicitudes por IP/15 min, antes de auth y
  maintenance, incluidos fallos. HTTP 429 message-only/Retry-After y headers draft-7.
  Tests usan IP por caso y un caso agota límite, sin desactivar protecciones.
- Mapper opcional de fallos en sendHttpStream comparte auditoría antes de primer
  byte; fallos después de bytes solo finalizan descarga. Otros exporters conservan
  mapper default. Runtime registra carga lazy para cerrar pool incluso usando solo 021.
- Guard exige inventario exacto no vacío, auth y marcador de validación. Frontera
  arquitectónica y check:modules strict incluyen importExport.
- Sin dependencias nuevas, cambios Prisma, SQL de negocio o DTO/SDK. Express principal.

## Evidencia local

- TDD: cuatro tests RED con factory pendiente; luego GREEN. Flujos prueban mapping,
  denegación message-only, limpieza de filtros, nombres, error identity y cierre parcial.
- Backend test:coverage: 436 pruebas / 50 archivos, ratchet aprobado.
- Suite Fastify integración completa: 395 pruebas / 16 archivos; 40 casos 021
  (20 por servidor), PostgreSQL18.4 desechable. PDF/Excel/workbook reales, permisos
  persistidos, Kiosk_Employee sin sesión, límite 50 MiB y rate-limit, errores y scope.
- Tras compartir auditoría se repiten los 40 casos 021 con otra BD desechable usando
  copia temporal del runner con filtro de archivo. Confirma auditoría de fallo previo
  a bytes y ausencia de segunda auditoría al cerrar descarga parcial.
- Frontend validate:ci:coverage: 276 pruebas / 71 archivos, tipos, formato,
  lint/budget 0/0, cobertura y build/PWA aprobados. Se inicia después del backend
  validate:ci/SDK; backend final vuelve a comprobar SDK sin cambios de frontend.
- Backend validate:ci final: formato/lint/budget 0/0, tipos globales/feriados/módulos
  strict, SDK sin cambios, nueve pruebas de schemas y build aprobados.
- Raíz: docs:check (133 Markdown/19 ADR), spec:check (25 specs), secrets:scan
  (0 secretos/31 coincidencias permitidas) y git diff --check aprobados.

Logs locales: /tmp/portal-021-red.log, /tmp/portal-021-green.log,
/tmp/portal-021-backend-ci.log, /tmp/portal-021-coverage.log,
/tmp/portal-021-integration.log, /tmp/portal-021-focused.log,
/tmp/portal-021-frontend-ci.log. No se incorporan logs al repositorio.
Ambas BD de comprobación se eliminan; base local preexistente no se modifica.

## Límites y rollback

Preview conserva expansión ZIP/workbook en memoria y mapping sin validación de
estructura; dates regex/dos schemas dispares, Excel con autorización 500/area
heredada, quiosco con scope amplio y servicio shift PDF inexistente 500. Calendario
conserva queries por día y límites UTC/local; renderer KPI materializa datos.
Fallo real KPI después de inicio de WorkbookWriter deja 200 ZIP parcial sin
registro de directorio final, comprobado en ambos adaptadores. Requiere decisión
previa al cutover, no se corrige silenciosamente ni se promete mayor rendimiento.
Multipart mantiene defaults nativos de fields/parts; 50 MiB es límite por archivo,
no presupuesto agregado ni descompresión. Campos mapping repetidos conservan 500.

Sin staging/gateway/PgBouncer, e2e/carga, jobs o clientes socket; esos gates siguen
reservados a 024/025. Revertir entrega retira módulo/registro/composición y restaura
controllers; DB y archivos no requieren transformación. Express sigue principal.
Próxima spec: 022 auditoría; quedan cuatro specs 022–025.
