# Tareas 075: carga diferida del modal de corrección de Worker Portal

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = una unidad revisable. Cada tarea cita su AC.

- [x] T1: Añadir y ejecutar la regresión E2E contra el baseline actual (AC1).
- [x] T2: Añadir prueba del modal real con props sintéticas, sin submit (AC2).
- [x] T3: Implementar wrapper `React.lazy` + `Suspense` en el feature barrel (AC1, AC2).
- [x] T4: Reconstruir solo el frontend local y ejecutar tres muestras frías comparables (AC3, AC4).
- [x] T5: Guardar análisis, registro y diario de rendimiento; revertir si no cumple umbrales (AC3, AC4).
- [x] T6: Correr tests focalizados, `spec:check`, `docs:check`, `npm run preflight` y `git diff --check` (AC5).
