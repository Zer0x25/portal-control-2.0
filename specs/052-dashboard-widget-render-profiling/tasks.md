# Tareas 052: Dashboard Widget Render Profiling

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita explícitamente sus criterios.

- [x] T1: Registrar commits, fases y duraciones por límite de `React.Profiler` conservando los contadores anteriores (AC1).
- [x] T2: Instrumentar los widgets desde el registro solo en desarrollo y comprobar el build de producción (AC3, AC5).
- [x] T3: Repetir tres muestras nuevas por ruta, agregar medianas y guardar el JSON de la corrida (AC2, AC4).
- [x] T4: Correr typecheck, lint, build, spec:check y docs:check; dejar interpretación y límites de la evidencia (AC4, AC5).
