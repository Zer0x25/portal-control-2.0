# Tareas 006: Piloto y evaluación

Spec: [spec.md](./spec.md). Plan: [plan.md](./plan.md).
Estado: T1–T6 completadas; validaciones locales completas. Evidencia en
[baseline.md](./baseline.md). La autorización del usuario en esta conversación
permitió ejecutar los pasos siguientes; ver [resultado](./result.md) y [spec 007](../007-stack-node26-fastify/spec.md).

## Entregas revisables

- [x] T1: confirmar baseline de feriados, ejecutar tests existentes y automatizar B1–B6; registrar divergencias sin corregir comportamiento (AC1, AC2, AC5).
- [x] T2: definir API mínima del caso de uso y dependencias; probar la capacidad aislada antes de implementarla y registrar fallo esperado (AC3, AC5).
- [x] T3: extraer consulta y adaptador Prisma; delegar desde fachada; comparar baseline y resultados preservando autosync y reloj (AC1, AC2, AC4).
- [x] T4: añadir guardas de imports con comprobación no vacía y verificar que rechazan una infracción representativa (AC3).
- [x] T5: asegurar descubrimiento real de tests y ejecutar validaciones secuenciales, contratos y coverage (AC4, AC5, AC6).
- [x] T6: medir piloto, documentar decisión y rollback; proponer siguiente corte en escrituras o una capacidad independiente (AC7).

Una tarea debe permitir un commit o PR revisable con propósito único. Un cambio
de arquitectura y una corrección de negocio tienen tareas y criterios distintos.

## Entrada mínima para un agente

```text
Trabaja sobre una sola tarea de specs/006-arquitectura-mantenible/tasks.md.
Lee AGENTS.md, specs/constitution.md y spec/plan/behavior de esta entrega.
Antes de editar, identifica AC, consumidores, tests reales y archivos permitidos.
Confirma el comportamiento existente mediante caracterización.
Para capacidad nueva, ejecuta primero el test y registra su fallo esperado;
implementa lo mínimo y refactoriza manteniendo pruebas verdes.
Preserva contratos, permisos, tiempo chileno y auditoría. Registra bugs hallados
sin incorporarlos a esta extracción. Si el alcance necesita cambiar, describe
la evidencia y el nuevo alcance antes de implementar ese cambio.
Ejecuta pruebas puntuales y las validaciones del plan al cerrar la entrega.
Reporta AC cubiertos, escenarios/tests, comandos y resultados, diff y rollback.
No declares verificado lo que no ejecutaste. Actualiza solo tareas completadas.
```

## Evaluación antes de ampliar

- Dependencias externas directas del caso de uso, antes/después.
- Archivos necesarios para explicar la consulta y sus efectos, antes/después.
- Tiempo de pruebas aisladas con entorno comparable y sin red/BD real.
- Cada B1–B6 enlaza a una prueba ejecutada; ninguna tarea finalizada sin evidencia.
- Guardas efectivas y validaciones verdes; registrar coste de nuevas capas.

No usar líneas de código o cobertura global como único indicador de mantenibilidad.
Si el piloto aumenta indirection sin reducir contexto o acoplamiento, simplificar
el diseño antes de replicarlo.
