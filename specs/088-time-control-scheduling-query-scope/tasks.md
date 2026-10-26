# Tareas 088: limitar consultas de useScheduling en Control horario

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

- [x] T1: Probar los modos `full`, `schedule-enrichment` y `correction-requests`, incluidos flags de
      empleados y correcciones (AC1, AC2, AC3).
- [x] T2: Implementar el modo mínimo y seleccionarlo solo en Control horario;
      verificar consumidores restantes (AC1, AC2, AC3, AC6).
- [x] T3: Capturar tres perfiles después del rebuild frontend y comparar API y
      TBT con la base conservando la imagen backend (AC4, AC5, AC6).
- [x] T4: Ejecutar preflight, completar evidencia y actualizar `.jules/bolt.md`.
