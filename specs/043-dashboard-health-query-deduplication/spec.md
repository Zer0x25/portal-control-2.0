# Spec 043: Deduplicación de la consulta de salud en Dashboard

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-23
- ADR relacionado: N/A

## Problema

La captura de Dashboard en staging de la spec 042 registró 21 solicitudes API y
dos `GET /api/health`. La pantalla ya usa la query canónica
`queryKeys.systemHealth()`, pero `syncSlice.validateInstanceId()` llama por
separado a `configService.getHealth()`. El conteo API baja al quitar esa
lectura duplicada; las mediciones Lighthouse de spec 042 no mostraron una
mejora temporal estable y no permiten atribuirle un cambio en LCP o FCP.

## Alcance

Dentro:

- Reutilizar la query canónica de salud al validar el `instanceId` al iniciar la sesión; deduplicar solicitudes en vuelo, sin aceptar una respuesta cacheada antigua para validar la instancia.
- Mantener disponible el `instanceId` junto con el payload completo de salud que consumen los indicadores y la vista de administración.
- Preservar el comportamiento fail-safe ante error o ausencia de `instanceId`, y la purga/refresco forzado al detectar otra instancia.
- Medir en staging cuándo aparecen los marcadores visibles de Dashboard y las solicitudes, con duración y offsets de inicio/fin por endpoint; guardar la comparación y el identificador de imagen/hash para priorizar el siguiente cuello.

Fuera (explícito):

- Cambiar el endpoint o sus contratos, el intervalo de sondeo, los estados visuales de salud o el manejo de 503.
- Reducir las otras 20 rutas observadas o atribuir a este cambio mejoras de Lighthouse/CWV.

## Criterios de aceptación

- [x] AC1: Al iniciar una sesión, `validateInstanceId()` lee el dato de la query `systemHealth` y no dispara una segunda llamada independiente a `/api/health`.
- [x] AC2: Si la query de salud ya está en vuelo, `validateInstanceId()` comparte esa solicitud; si solo hay datos cacheados, verifica con una lectura nueva antes de guardar el `instanceId`.
- [x] AC3: La ausencia/error de salud mantiene el fallback fail-safe; un mismatch sigue purgando datos locales y forzando la sincronización de consultas activas.
- [x] AC4: Tres capturas autenticadas y secuenciales del Dashboard en staging registran offsets de visibilidad de `main-content`/`server-clock`, `/api/health` como máximo una vez, offsets de inicio/fin y duración/status por request, y comparan con spec 042 guardando fecha, commit e imagen.
- [x] AC5: Los tests focalizados, checks de tipos/lint/formato, build/presupuesto, `spec:check` y `docs:check` pasan; el informe no atribuye mejora temporal a Lighthouse.

## Restricciones

- No modificar rutas, permisos, schemas, OpenAPI/SDK, datos persistidos ni la política general de freshness de React Query.
- Reutilizar el payload completo de la query canónica; no guardar un objeto parcial bajo `systemHealth`.
- Revertir los cambios en la query, `syncSlice` y el gate de staging restaura la validación independiente previa.

## Trazabilidad

- Tests: `frontend/src/tests/state/syncSlice.test.ts`, `frontend/src/hooks/queries/useHealthQuery.spec.ts` y `frontend/e2e/performance.spec.ts`.
- Evidencia: `evidencia/resultado-2026-10-23.md`, perfil API de staging y comparación JSON.
- Documentación: `.jules/bolt.md`.
