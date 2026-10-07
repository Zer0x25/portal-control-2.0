# Tareas 025: Cambio de servidor principal

Spec: [spec.md](spec.md). Plan: [plan.md](plan.md).

- [x] T1: Inventario Fastify no vacío de rutas, autenticación y validación (AC1).
- [x] T2: BDD y dos tests RED reales de entrypoint/dependencias (AC2).
- [x] T3: Fastify por defecto y retiro de Express del runtime (AC3).
- [x] T4: Integración BD, gateway/PgBouncer, UI y ciclo de vida final (AC4).
- [x] T5: Gates, medición acotada, documentación y rollback verificado (AC5).

## Tandas previas completadas

- [x] A: Autenticación socket, salas derivadas del servidor y revalidación por lote.
- [x] B1: Proyecciones de eventos y autorización por rol/empleado.
- [x] B2a/b/c: Secretos SMTP/audit/errores y reset de BD atómico.
- [x] B2d1: Reset de contraseña/sesiones atómico; rechazo de login/MFA anterior.

## Ajuste de alcance autorizado

B2d2 y C pasan a [backlog](backlog.md) de mejoras posteriores. No son entregas
pendientes de migración ni originan nuevas specs para posponer el cutover.
D se resuelve en T3–T5 de esta misma spec.
