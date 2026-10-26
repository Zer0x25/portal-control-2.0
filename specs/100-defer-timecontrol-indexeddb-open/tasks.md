# Tareas 100: Diferir apertura de IndexedDB hasta el primer uso

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: cada tarea es atómica y cita sus criterios de aceptación.

- [x] T1: Capturar el baseline de Spec 099 y escribir primero la prueba de ciclo
      de vida de IndexedDB. (AC1)
- [x] T2: Diferir la apertura hasta la primera operación y ejecutar pruebas de
      sync frío, consulta y fallback offline. (AC1, AC2)
- [x] T3: Reconstruir staging; ejecutar tres perfiles y cinco Lighthouse,
      comparar con los umbrales y conservar o revertir el runtime. (AC3)
- [x] T4: Ejecutar preflight, revisar salud de staging, documentar evidencia y
      actualizar `.jules/bolt.md`. (AC4)
