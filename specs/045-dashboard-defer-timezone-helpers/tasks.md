# Tareas 045: Defer Dashboard Timezone Helpers

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

- [x] T1: Agregar pruebas de aritmética UTC y de chunks ausentes al abrir Dashboard; confirmar que la regresión de chunks falla antes del cambio (AC1, AC2)
- [x] T2: Extraer el parser UTC y diferir los imports de helpers de zona horaria a las acciones que los usan (AC1, AC2, AC3)
- [x] T3: Ejecutar regresiones enfocadas, check/lint/build frontend, gates de gobernanza y Lighthouse frío de tres muestras; guardar resultados (AC1, AC2, AC3, AC4)
