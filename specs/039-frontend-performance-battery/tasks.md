# Tareas 039: Frontend Performance Battery

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita explícitamente sus criterios.

- [x] T1: Correr la medición existente contra staging `127.0.0.1:8080`, guardar resultado y registrar límites del método anterior (AC1, AC6).
- [x] T2: Medir scroll virtualizado con intervalos de frame en navegador, muestras suficientes y detección explícita de datos/overflow (AC2, AC5).
- [x] T3: Repetir mediciones de rutas y cambios de pestaña, adjuntar resultados JSON al reporte Playwright (AC3, AC4).
- [x] T4: Crear runner local serial para Playwright + Lighthouse y exponer `npm run perf:staging` (AC1, AC5).
- [x] T5: Ejecutar la batería sobre el build actual y registrar baseline comparable con el commit y los resultados (AC4, AC6).
- [x] T6: Validar tipado/lint de frontend y checks de specs/documentación (AC1–AC7).
- [x] T7: Añadir tres corridas Lighthouse de Dashboard con storage limpio y medir con ellas el primer cambio (AC1, AC4, AC7).
- [x] T8: Ampliar Playwright de cinco a diez rutas y Lighthouse de seis a once; autenticar Worker Portal como trabajador, validar que cada URL llega a su ruta esperada y guardar evidencia (AC1, AC3, AC8).
- [x] T9: Crear catálogo compartido de 18 rutas y ocho familias, conectar Lighthouse y Playwright al catálogo y comprobar que sus URLs concuerden (AC9).
- [x] T10: Añadir mediciones repetidas para búsquedas locales, pestañas diferidas y apertura/cierre de paneles representativos sin modificar datos de negocio (AC5, AC11).
- [x] T11: Persistir un registro JSON por corrida con esquema versionado, entorno, imagen de staging, grupos de rutas, reportes y estado de las fases; documentar el formato (AC10).
- [x] T12: Ejecutar la batería ampliada contra staging y guardar su registro como evidencia (AC1, AC3, AC4, AC6, AC9–AC11).
- [x] T13: Investigar el error Lighthouse `NO_FCP` del login en ambos presets; conservar su cobertura Playwright y excluirlo explícitamente del conjunto Lighthouse (AC9, AC12).
- [x] T14: Corregir el orden de argumentos Puppeteer detectado durante spec 040, exigir shell existente, reproducir Worker Portal antes/después y repetir la batería con diagnóstico de ruta/rol (AC8, AC13).
- [x] T15: Añadir a la batería tres muestras frías para Worker Portal y Control horario, validar sus rutas/roles y guardar las seis métricas Lighthouse en el registro versionado (AC1, AC4, AC9, AC10, AC14).
