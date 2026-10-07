# Plan 020: Medidores, notas y configuración

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Diseño y archivos

Tres módulos independientes modules/meters, modules/notes y modules/configs,
con application/contracts.ts y flows.ts, API pública index.ts y http/routes.ts.
Meters comparte envelope/paginación y parse completo; notes proyección de campos,
ID y respuestas; configs errores compartidos, orquestación PDF y reloj inyectado.
Composición services/meterFlows.ts, noteFlows.ts y configFlows.ts; infraestructura
companyPolicyStorage.ts conserva streaming, basename, access y best effort delete.
Controllers Express quedan delgados, sin casts a Express para el candidato.
MeterService, NoteService y ConfigService conservan persistencia/eventos.

Fastify usa @fastify/multipart 9 para stream de un PDF 15 MiB, y @fastify/static 8
con serve:false para descarga con rangos/ETag sin publicar carpeta. Plugins y lock
se agregan como dependencias necesarias de adaptadores, sin actualizar otras.
Consultar docs oficiales [multipart](https://github.com/fastify/fastify-multipart)
y [static](https://github.com/fastify/fastify-static). Registro/runtime, strict y
guards no vacíos incluyen superficie exacta y excepciones públicas explícitas.

## Verificación

RED de cuatro casos unitarios, GREEN y guards negativos. Integración aislada con
Prisma/PostgreSQL 18.4, sesiones reales, spy de SocketService, triggers temporales
para fallos DB, subida/descarga PDF y cleanup de archivos propiedad de cada prueba.
Backend validate:ci, test:coverage, test:fastify:integration. Solo después del SDK,
frontend validate:ci:coverage. Raíz docs:check/spec:check/secrets:scan/diff check.
No benchmark, staging o e2e; se reservan a integración/cutover 024/025.

## Rollback

Revertir entrega 020 (módulos, composición, controllers, registro, guards y nuevas
dependencias) mantiene Express principal con controllers anteriores. Sin cambios
Prisma o formato DB; metadata PDF opaca compatible y misma carpeta de uploads.
