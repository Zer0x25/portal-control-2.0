# Tareas 067: Time Control Instance Validation Breakdown

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

- [x] T1: Agregar flags opt-in y marcas de tiempo al query function, `fetchQuery`, fase de validación y etapas internas del cliente HTTP, con tests unitarios (AC1, AC3, AC4).
- [x] T2: Capturar tiempos Resource Timing, etapas del cliente HTTP y status de readiness por contexto en Playwright, sin URL/query en artefactos (AC1, AC3).
- [x] T3: Implementar recolector seguro de `docker logs` que exija una muestra Fastify por contexto y omita IDs/URLs (AC2).
- [x] T4: Ejecutar el probe y recolector tres veces/contextos en staging, guardar evidencia y decidir el próximo foco (AC3, AC5).
- [x] T5: Ejecutar checks específicos, preflight, verificar staging y registrar resultado en `.jules/bolt.md` (AC4, AC5).
