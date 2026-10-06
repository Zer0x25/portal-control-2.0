# Plan 022: Auditoría

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Estrategia

1. Inspeccionar /api/audit-logs y sus servicios; completar contratos y riesgos.
2. Escribir behavior.md con ejemplos y pruebas que fallen primero.
3. Extraer puertos y casos de uso, implementar adaptador y guard no vacío.
4. Verificar permisos, fallos, persistencia y efectos; registrar result.md.

## Archivos a tocar

Inventario pendiente: identificar routers, servicios y tests de la superficie
indicada antes de modificar código. No reutilizar controllers Express como
handlers Fastify. En 024/025 agregar entrypoint, sockets/jobs, compose, gateway
y contrato OpenAPI al inventario.

## Verificación y rollback

Backend: validate:ci, test:coverage, test:fastify:integration. Después del SDK,
frontend: validate:ci:coverage. Raíz: docs:check, spec:check, secrets:scan.
024/025 requieren además staging, e2e, carga y ciclo de vida del servidor.
Mientras Express siga principal, revertir el registro del módulo candidato;
025 debe documentar y ensayar rollback antes de cambiar el servidor.
