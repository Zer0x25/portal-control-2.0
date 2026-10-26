# Tareas 049: Defer Role-specific Auto-start Code

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita sus AC.

- [x] T1: Escribir primero y pasar pruebas de elegibilidad, auto-inicio e idempotencia; separar código del layout con lazy-load y sumar guard Playwright (AC1, AC2, AC3).
- [x] T2: Ejecutar frontend `validate:ci`, staging E2E dirigido y preflight; reconstruir staging y crear commit de código (AC1, AC2, AC3).
- [x] T3: Correr batería completa en staging con checkout limpio, comparar las tres muestras frías y 17 rutas, guardar resultado/ledger y crear commit de evidencia (AC4).
