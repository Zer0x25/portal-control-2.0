# Resultado 020: Medidores, notas y configuración

Contrato: [spec](spec.md), [diseño](plan.md), [BDD](behavior.md).
Fecha: 2026-10-06. Implementación y validación local; sin commit de esta entrega.
Commit previo: feb4545, correo/reportes programados 019, hooks aprobados. Sin push.

## Entrega

Tres módulos públicos separados, meters/notes/configs, con puertos y aplicación
pura. Catorce rutas nativas y controllers Express delgados comparten parsing,
respuestas, errores, lógica de policy y actor de sesión para configuración.
Strict, guards de importaciones/efectos globales y manifest exacto no vacío cubren
módulos; configs exige auth falsa solo en dos rutas públicas, true en restantes.

@fastify/multipart 9.4.0 y @fastify/static 8.3.0 se agregan para stream de PDF 15 MiB
y descarga Range/ETag. serve:false no publica directorio ni nuevas rutas. No hay
migración Prisma ni cambios de swagger/SDK, jobs o servidor principal.
Config JSON arbitrario se serializa explícitamente para conservar strings/null.
Express sendFile recibe root explícito y basename: corrige descarga en checkout
bajo .codex, manteniendo carpeta autorizada sin permitir dotfiles finales.

## Verificación

Cuatro pruebas RED antes de implementación en /tmp/portal-020-red.log; GREEN de
orquestación, proyección/validación, errores y orden guardar-before-delete.
Integración real con sesiones persistidas, spies de efectos, triggers temporales
DB, carga/descarga archivos propios y validación completa de lectura 51.

- Backend validate:ci: formato, lint/budget 0/0, tipos globales y módulos strict,
  SDK sincronizado sin cambios, nueve pruebas de schemas y build aprobados.
- Cobertura: 423 pruebas en 49 archivos, ratchet aprobado sin reducir umbrales.
- Integración: 355 pruebas en 15 archivos; 52 casos 020 (26 por servidor),
  PostgreSQL 18.4 creado y eliminado por script. Rangos 206/condicionales 304,
  JSON escalar/null, lote 51 inválido, permisos y eventos comprobados.
- Límites JSON: medidores/notas/configs rechazan más de 1 MiB antes de efectos;
  multipart rechaza PDF mayor a 15 MiB con 413, y MIME/campo/missing con 400.
- Frontend validate:ci:coverage: 276 pruebas en 71 archivos, tipos, formato,
  lint/budget 0/0, cobertura y build/PWA (159 entradas precache) aprobados.
- Raíz: docs:check (131 Markdown/19 ADR), spec:check (25 specs), secrets:scan
  (0 secretos) y git diff --check aprobados.

Logs locales: /tmp/portal-020-red.log, /tmp/portal-020-green.log,
/tmp/portal-020-backend-ci.log, /tmp/portal-020-coverage.log,
/tmp/portal-020-integration.log y /tmp/portal-020-frontend-ci.log.
No se incluyen logs en repositorio.

## Límites y rollback

Deudas preservadas: medidores sin atomicidad de lote, rango UTC/local y paginación
NaN; notas con author del cliente/hard delete; config auditoría/secretos y write
no atómico; futuro lock 500; PDF por MIME sin firma y posible huérfano al fallar DB.
El nombre opaco de archivo Fastify usa UUID .pdf; Express mantiene Multer.
No se ha verificado staging/PgBouncer, clientes socket conectados, jobs, e2e o carga.
No se promete mayor rendimiento sin benchmark equivalente.

Revertir entrega retira registro/módulos/composición y plugins, restaura controllers
previos y conserva DB/archivos compatibles. Express sigue principal. Próxima spec:
021 importación/exportación; quedan cinco specs 021–025.
