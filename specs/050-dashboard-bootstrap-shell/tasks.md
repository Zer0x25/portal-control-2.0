# Tareas 050: Dashboard Bootstrap Shell

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

- [x] T1: Añadir primero prueba Playwright que observe render inicial, LCP, ruta elegible y retirada del shell (AC1, AC2, AC3).
- [x] T2: Implementar shell HTML externo a `#root`, ruta/sesión de visibilidad, reloj local, retirada segura y CSP con hash verificado en build (AC1, AC2, AC5).
- [x] T3: Ejecutar las tres muestras frías y la batería completa; conservar solo si cumple la mejora de Lighthouse (AC3, AC4, AC5).
- [x] T4: Guardar comparación, hashes, límites y comandos de validación (AC4, AC5).
- [x] T5: Ejecutar preflight frontend y gates de gobierno antes del commit (AC1–AC5).
- [x] T6: Añadir el handoff de CSS crítico, proteger Dashboard claro/oscuro, mantener ocultas las demás rutas y verificar el fallback del timeout antes de conservarlo tras las tres mediciones frías (AC6, AC7).
