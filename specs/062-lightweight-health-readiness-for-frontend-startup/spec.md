# Spec 062: Lightweight Health Readiness for Frontend Startup

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

La validación de instancia del arranque fuerza `GET /api/health`, que reúne métricas completas de sistema y tamaño de BD antes de continuar. La captura fría de Spec 061 midió 369,5 ms de mediana en esa fase; la respuesta completa fue de 8.174 bytes. `/api/health/ready` ya responde en 18 bytes, pero no incluye `instanceId` ni el estado degradado por respaldos que usa la interfaz.

## Alcance

Dentro:

- Ampliar la respuesta ligera de readiness con `instanceId` y estado de salud `healthy | degraded`, manteniendo `status: "ready"` y el 503 cuando la BD no responde.
- Usar la consulta ligera compartida para el estado del shell, el indicador simple de conexión y la validación de instancia.
- Mantener `/api/health` y su consumo detallado en el panel de mantenimiento.
- Medir el arranque frío en staging y guardar muestras comparables con Spec 061.

Fuera (explícito):

- Alterar el criterio de readiness de infraestructura, el identificador de instancia o el estado de respaldos.
- Cambiar el orden/bloqueo de sincronización, las consultas de datos de Usuarios/Empleados o persistencia.
- Cambiar otras rutas, base de datos o deployment de producción.

## Criterios de aceptación

- [x] AC1: `GET /api/health/ready` devuelve `{ status: "ready", healthStatus, instanceId }`; `healthStatus` refleja el mismo criterio healthy/degraded de `/api/health`, y una BD inaccesible continúa devolviendo HTTP 503 `NOT_READY`.
- [x] AC2: Estado de shell, indicador de conexión y validación de instancia usan una consulta ligera deduplicada; la validación sigue forzando una respuesta fresca y ante cambio de `instanceId` limpia el cache como antes.
- [x] AC3: El panel de mantenimiento conserva la consulta detallada. El contrato OpenAPI/Swagger/SDK documenta el cuerpo 200 y el 503.
- [x] AC4: Tres contextos fríos de staging guardan duración de validación/overlay y bytes de `/health/ready`; no aumentan requests API frente a Spec 061 y se reporta si existe mejora estadísticamente visible.
- [x] AC5: Tests dirigidos, typecheck, lint, sincronía SDK, gates SDD y preflight pasan; staging termina reconstruido y saludable.

## Restricciones

Fastify es el único servidor HTTP. No hay cambio persistente de arquitectura ni ADR. Las consultas de estado permanecen fuera del cache persistido. Rollback: devolver los tres consumidores a `useHealthQuery` y restaurar el contrato de `{ status: "ready" }` en `/api/health/ready`.

## Trazabilidad

- Tests: `backend/tests/unit/fastifyApp.test.ts`, `backend/tests/fastify-integration/holidays.test.ts`, tests de queries de frontend y `frontend/src/tests/state/syncSlice.test.ts`.
- Evidencia previa: `../061-skip-empty-cache-check-without-sync-marker/evidencia/resultado-2026-10-24.md`.
- Evidencia nueva: `evidencia/resultado-2026-10-24.md` y registro JSON de Playwright.
- Registro de aprendizaje: `.jules/bolt.md`.
