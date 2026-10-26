# Tareas 085: reducir el bloqueo del hilo principal en Control horario

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: toda tarea cita AC; runtime solo si el diagnóstico lo justifica.

- [x] T1: Registrar digest de staging y capturar cinco muestras Lighthouse de
      Control horario con configuración reproducible (AC1).
- [x] T2: Implementar y probar perfil CDP de producción con traducción de
      source maps y salida saneada; capturar dos tandas de tres perfiles (AC2).
- [x] T3: Revisar stacks repetidos; no apareció un candidato causal que
      justificara cambio de runtime según AC3 (AC3).
- [x] T4: Repetir cinco muestras y ejecutar batería completa solo si cambió
      runtime. No aplica: no cambió runtime (AC4, AC5).
- [x] T5: Documentar resultados, límites, decisión de conservar o descartar y
      siguiente foco en evidencia y `.jules/bolt.md` (AC6).
