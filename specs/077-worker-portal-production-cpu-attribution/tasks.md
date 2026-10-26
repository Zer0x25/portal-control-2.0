# Tareas 077: atribución CPU de producción para Worker Portal

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = una unidad revisable. Cada tarea cita sus criterios de
aceptación.

- [x] T1: Implementar y probar el agregador de CPUProfile y source maps con
      perfiles sintéticos (AC2, AC3, AC4).
- [x] T2: Añadir comandos de build perfilado con mapas y restauración del
      `dist` normal (AC4, AC5).
- [x] T3: Automatizar tres perfiles fríos autenticados de producción, mapearlos
      y guardar el registro saneado (AC1, AC2, AC3, AC4).
- [x] T4: Interpretar repetición, completar evidencia y bitácora sin afirmar
      mejoras de Lighthouse o TBT (AC3, AC4).
- [x] T5: Ejecutar pruebas del perfilador, gates de integridad/preflight y
      `git diff --check`; confirmar build normal y staging intactos (AC5).
- [x] T6: Crear commit local Conventional Commits y verificar árbol limpio
      (AC5).
