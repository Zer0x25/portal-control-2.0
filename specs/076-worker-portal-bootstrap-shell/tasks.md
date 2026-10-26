# Tareas 076: shell temprano para Worker Portal

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = una unidad revisable. Cada tarea cita sus criterios de
aceptación.

- [x] T1: Conservar el baseline y la auditoría del elemento LCP de los tres informes fríos (AC4, AC5).
- [x] T2: Añadir la prueba Playwright del shell, sesión, root, LCP y reloj real; verificarla contra el build anterior (AC1, AC3, AC4).
- [x] T3: Extender el shell existente a Worker Portal sin duplicar markup o CSS y pasar la prueba dirigida (AC1, AC2, AC3).
- [x] T4: Reconstruir solo el frontend de staging, ejecutar la batería comparable, guardar run y analizar métricas (AC4, AC5, AC6).
- [x] T5: Actualizar `.jules/bolt.md`, completar evidencia y ejecutar `spec:check`, `docs:check`, preflight y `git diff --check` (AC6).
- [x] T6: Crear un commit local Conventional Commits con árbol limpio y tarea cerrada (AC6).
