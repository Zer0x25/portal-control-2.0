# Plan 016: Permisos y correcciones

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Estrategia y contrato

1. Inventario de ocho rutas y deudas en spec/behavior; RED de cuatro flujos.
2. Crear modules/leaves y modules/corrections con contratos neutrales y salidas
   genéricas inferidas en services/leaveFlows.ts y services/correctionFlows.ts.
3. Parse explícito LeaveRecordSchema en adaptadores; correcciones pasan cuerpo
   original tras validar, como Express. Ownership crea outcome message-only 403.
4. Controllers delgados, plugins nativos, manifiestos exactos/strict/guard públicos.
5. PostgreSQL desechable por transporte: materialización/sellado, inmutabilidad,
   filtros, scopes, aprobación/rechazo/concurrencia/rollback e historial/actores.
6. Gates y resultados; no reescribir algoritmos ni endurecer contratos silenciosamente.

## Archivos y riesgos

modules/leaves, modules/corrections, services/*Flows, dos controllers,
app/runtime/routeContracts/tsconfig, fixtures/guards/unit/integración y docs.
LeaveService/CorrectionService no requieren cambios internos. Conservar
withDirectTransaction en aprobación, fallos y efectos heredados. No introducir
lecturas por fila en módulos; persistencia existente se documenta como deuda.

## Verificación y rollback

Node 26: backend validate:ci/test:coverage/test:fastify:integration, luego
frontend validate:ci:coverage tras check:sdk. Raíz docs:check/spec:check/secrets:scan,
git diff --check. BD aislada con propietario y cleanup. Sin staging ni DB local.
Revertir plugin/entrega; Express principal, sin migración de BD.

Errores usan AppError y toCaughtError, ambos helpers puros admitidos explícitamente
por el guard solo para estos módulos; valores desconocidos se estrechan sin any y
los fallos inesperados se relanzan preservando stack e identidad.
El defecto de reactivación al extender ausencia queda cubierto y pendiente de
spec de corrección; no se presenta la paridad como prueba de ausencia de defectos.
