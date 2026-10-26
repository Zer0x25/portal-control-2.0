# Tareas 057: Time Control Sync Overlay LCP

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita explícitamente sus criterios.

- [x] T1: Agregar la prueba roja de tres arranques fríos, candidato LCP, estilos del overlay e hit-test durante sync; el baseline falló con la animación `enter` (AC1, AC2).
- [x] T2: Quitar fade y pulsos decorativos sin cambiar el bloqueo, el spinner o el progreso (AC2).
- [x] T3: Reconstruir frontend staging, correr la prueba enfocada y la batería completa; restaurar las clases originales porque el LCP mediano solo bajó 43 ms, bajo el mínimo de 100 ms (AC3, AC4).
- [x] T4: Correr typecheck, lint, preflight, checks de specs/documentación y formato; guardar el registro y el resultado del experimento en Spec 057/039 (AC1, AC3–AC5).
