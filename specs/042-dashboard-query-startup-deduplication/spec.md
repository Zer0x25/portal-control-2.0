# Spec 042: Deduplicación de consultas al iniciar Dashboard

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-23
- ADR relacionado: N/A

## Problema

El perfil CDP de la spec 041, tomado en una sesión administrativa fría de Dashboard,
registró 32 solicitudes API; once endpoints se solicitaron dos veces. `useEmployees()`
también activa `/api/employees/kiosk` aunque solo el flujo de kiosco consume esa lista.
Al restaurar sesión, `syncSlice.runSync` invalida raíces que incluyen consultas ya cargadas
por la pantalla, forzando otra lectura inmediata aunque su caché aún sea fresca.

## Alcance

Dentro:

- La query pública del kiosco solo se activa desde el flujo de kiosco, manteniendo su uso sin sesión y sin conexión desde caché.
- El refresco de arranque actualiza consultas activas vencidas o invalidadas y se une a una solicitud ya en curso; las consultas frescas no se vuelven a descargar.
- Un cambio detectado de instancia de base de datos conserva un refresco forzado para no mostrar datos de la instancia anterior.
- Registrar en staging el conteo de solicitudes repetidas y comparar antes/después contra el lote válido de la spec 041.

Fuera (explícito):

- Cambios de endpoints, permisos, contratos OpenAPI, staleTime, persistencia/offline del kiosco y eventos de invalidación por socket o mutaciones.
- Optimizar la cascada `useScheduling` → `kpis/overview`; queda para el siguiente ciclo una vez medida esta corrección.

## Criterios de aceptación

- [x] AC1: En una ruta autenticada no-kiosco, `useEmployees()` no ejecuta `GET /api/employees/kiosk`; en kiosco sí lo ejecuta sin exigir token y conserva el servicio offline.
- [x] AC2: Al iniciar con consultas activas frescas, la sincronización no vuelve a pedirlas; si una consulta activa está vencida o invalidada, la refresca una vez y no cancela ni duplica una petición en curso.
- [x] AC3: Si `validateInstanceId()` detecta otra instancia, el inicio fuerza el refresco de consultas activas, incluso si la caché anterior parecía fresca.
- [x] AC4: La captura de staging muestra menos solicitudes API totales y ninguna consulta `employees/kiosk` en Dashboard; evidencia registra versión, hash, comparación y límites.
- [x] AC5: Regresiones, TypeScript, lint 0/0, formato, `spec:check`, `docs:check`, build y flujos staging pertinentes pasan.

## Restricciones

Sin cambios de contratos, datos persistidos ni permisos. Las invalidaciones explícitas de sockets y mutaciones permanecen vigentes. Revertir los cambios de `useEmployeesQuery`, `useEmployees` y `syncSlice` restaura el comportamiento anterior.

## Trazabilidad

- Tests: `frontend/src/tests/hooks/useEmployeesQueryGating.test.tsx`, `frontend/src/tests/lib/querySync.test.ts`, `frontend/src/tests/state/syncSlice.test.ts`, `frontend/e2e/performance.spec.ts` y `frontend/e2e/offline.spec.ts`.
- Evidencia: [`resultado-2026-10-23.md`](evidencia/resultado-2026-10-23.md), [`comparison.json`](evidencia/comparison.json), [`dashboard-startup-api-requests.json`](evidencia/dashboard-startup-api-requests.json) y el [registro completo de batería](../039-frontend-performance-battery/evidencia/runs/2026-10-23T22-55-31-580Z-45138318.json).
