# Tareas 078: reutilizar el formateador de meses de Worker Portal

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = una unidad revisable. Cada tarea cita sus criterios de
aceptación.

- [x] T1: Fijar la paridad de opciones mensuales en el test del hook antes del cambio (AC1).
- [x] T2: Implementar la instancia local reutilizable del formatter y correr el test/typecheck/lint (AC1, AC2).
- [x] T3: Reconstruir únicamente frontend en staging y verificar el flujo Worker sin mutaciones (AC4, AC5).
- [x] T4: Perfilar 3/3 y conservar el cambio solo si supera el umbral; si falla, revertir y restaurar staging (AC3, AC4).
- [x] T5: Documentar el resultado y pasar preflight antes del commit (AC6).
- [x] T6: Crear commit local Conventional Commits y confirmar árbol limpio (AC6).
