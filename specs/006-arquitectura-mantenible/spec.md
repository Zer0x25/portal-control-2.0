# Spec 006: Arquitectura mantenible y desarrollo por contratos

- Estado: Implementado — consulta extraída; validaciones locales completas
- Autor: Codex, a partir de la solicitud del equipo
- Fecha: 2026-10-06
- ADR relacionado: [ADR-0010](../../docs/adr/0010-sdd-agentic-workflow.md)
- SDD técnico: [plan.md](./plan.md)
- Ejemplos BDD: [behavior.md](./behavior.md)
- Ejecución: [tasks.md](./tasks.md)

## Problema

El equipo necesita que humanos y agentes puedan cambiar una capacidad de
producto con contexto acotado, contratos explícitos y pruebas reproducibles.
El repositorio ya ofrece specs, ADR, OpenAPI, SDK y ratchets; faltan límites
de dependencia verificables y trazabilidad del requisito al comportamiento.

Evidencia de esta revisión, que es exploratoria y no una auditoría completa:

- [HolidayService](../../backend/src/services/HolidayService.ts) mezcla consultas,
  sincronización HTTP, reloj, persistencia, auditoría y sockets. Su lectura puede
  iniciar sincronización y escrituras: esto es comportamiento existente que
  debe caracterizarse antes de extraerlo.
- [TimeRecordService](../../backend/src/services/TimeRecordService.ts) tiene
  1.143 líneas en este checkout. El tamaño sirve para priorizar inspección,
  no demuestra por sí solo un defecto de diseño.
- Ya hay reglas separadas en `backend/src/domain/` y features en frontend.
  La evolución debe aprovechar ambas bases.
- [spec-check](../../scripts/spec-check.cjs) comprueba archivos y checkboxes,
  pero no dependencias arquitectónicas ni correspondencia AC → test.
- Los scripts de unit y coverage seleccionan `tests/unit` y `tests/*.test.ts`.
  Las pruebas existentes de sincronización estaban en `tests/services`, fuera
  de esa selección. T1 las trasladó sin cambios a
  [holidayService.sync.test.ts](../../backend/tests/unit/holidayService.sync.test.ts).

## PRD: objetivo de producto y entrega

Usuarios de esta mejora: mantenedores y agentes que entregan cambios, y usuarios
finales que necesitan continuidad de los flujos existentes.

Resultado esperado: una capacidad puede evolucionar sin conocer todo el sistema;
su comportamiento, sus dependencias y su verificación tienen una entrada clara.

La primera entrega es un piloto en feriados, usando la consulta como primer
corte. No promete un cambio visible de producto. Después se evalúa el patrón
antes de ampliarlo a escrituras o a dominios de mayor riesgo.

## Alcance

Dentro:

- Un flujo documental que aprovecha `spec.md`, `plan.md` y `tasks.md`.
- Consulta de feriados extraída a un caso de uso con dependencias explícitas.
- Fachada compatible en la ubicación actual del servicio.
- Caracterización, escenarios de comportamiento y guardas de dependencias.
- Medición del piloto para decidir la siguiente extracción.

Fuera (explícito):

- Reescritura global, microservicios, cambio de framework o de base de datos.
- Cambios de endpoints, permisos, formatos, esquema Prisma o SDK público.
- Cambiar la política de autosync, año local, atomicidad o reintentos.
- La extensión a Node 26 y piloto Fastify está autorizada en [spec 007](../007-stack-node26-fastify/spec.md).
- Migrar el frontend completo o introducir Cucumber obligatoriamente.
- Declarar aprobada una arquitectura permanente antes de probar el piloto.

## Criterios de aceptación

- [x] AC1: consulta conserva filtros, orden, formatos paginado/no paginado y metadatos; escenarios B1–B3 tienen tests automatizados.
- [x] AC2: autosync conserva condiciones y errores existentes; B4–B6 prueban la interacción con una dependencia sustituible, sin HTTP externo real.
- [x] AC3: dominio y aplicación del piloto no importan Express, Prisma, `db.ts`, sockets ni `fetch`; guardas con enumeración no vacía detectan las infracciones.
- [x] AC4: el consumidor HTTP mantiene rutas, validación, autorización y fachada; pruebas de contrato y SDK no presentan cambios públicos.
- [x] AC5: cada escenario tiene un test identificado y evidencia de ejecución; caracterización y TDD se registran con sus diferencias explícitas.
- [x] AC6: las suites seleccionadas por CI incluyen realmente los nuevos tests; validaciones y ratchets existentes pasan sin rebajar umbrales.
- [x] AC7: se registra comparación antes/después de dependencias del caso de uso, archivos necesarios para entenderlo y duración de sus pruebas aisladas.

## Restricciones

Aplica la [constitución](../constitution.md) y `AGENTS.md`. Preservar
`ROUTE_MOUNTS`, tiempo de negocio chileno, cliente Prisma generado,
`withDirectTransaction`, SDK generado y presupuestos en cero.

Separar extracción y corrección funcional. Si se descubre un bug, registrarlo
con evidencia y alcance propio. No convertirlo silenciosamente en el contrato.

## Trazabilidad

`PRD → AC → escenario BDD → test → tarea → diff → evidencia de validación`.

Cada elemento tiene una única fuente: necesidad en este archivo; límites
técnicos en el plan; ejemplos en behavior; avance y resultados en tasks.

## Referencias de método

- [Cucumber: BDD](https://cucumber.io/docs/bdd/): descubrimiento, formulación y automatización mediante ejemplos.
- [Fowler: Strangler Fig](https://martinfowler.com/bliki/StranglerFigApplication.html): modernización incremental y convivencia temporal del código.
