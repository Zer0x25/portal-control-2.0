# Evidencia Spec 047: metadata del reglamento diferida

## Método

Comparé tres corridas de staging de Spec 046 con tres corridas posteriores a reconstruir el frontend de Spec 047. Se reutiliza el mismo test de arranque del Dashboard, login Admin, navegador y staging local; las corridas fueron seriales. Cada resultado conserva duración y estado HTTP por endpoint.

## Resultados

| Medición                       |    Antes (mediana, 3 corridas) | Después (mediana, 3 corridas) |
| ------------------------------ | -----------------------------: | ----------------------------: |
| Endpoints API del Dashboard    |                             10 |                             9 |
| GET metadata de company-policy | 1 por corrida (26,52–56,73 ms) |                             0 |
| Contenido principal visible    |                      564,82 ms |                     553,08 ms |
| Reloj visible en DOM           |                      602,52 ms |                     571,27 ms |
| Respuestas 200 / duplicados    |              10 / 0 duplicados |              9 / 0 duplicados |

Se quitó 1 de 10 solicitudes iniciales (−10%). La lectura retirada no determina la URL del enlace: el backend siempre devuelve `/api/configs/public/company-policy/file`, que queda como URL predeterminada del frontend. `VITE_COMPANY_POLICY_URL` sigue teniendo prioridad.

Las marcas de contenido y reloj mejoran numéricamente en estas medianas, pero los rangos de las corridas antes y después se solapan. La captura previa también muestra que la metadata terminó antes de contenido visible en una de tres corridas y después en las otras; por tanto, estas mediciones no atribuyen una mejora de render ni de Core Web Vitals a este cambio.

## Rutas restantes

- `/api/audit-logs`: `useProactiveDetectionsQuery`, usado para las alertas de integridad del centro de notificaciones en Administrador y Supervisor Elevado.
- `/api/corrections/stats`: `useNotifications`, usado para el aviso de solicitudes pendientes.
- `/api/notes`: `AmbientReminderManager`, que necesita las notas activas para elegir recordatorios ambientales.

Las tres rutas tienen consumidores activos; quedan como candidatas solo si se demuestra una condición de rol, apertura o configuración que permita evitar consultas sin retrasar esas funciones.

## Validación

- Test unitario de herramientas del Dashboard: 11/11.
- Test E2E de inicio del Dashboard en staging: 3/3; nueve endpoints únicos, todos HTTP 200, sin duplicados ni rutas de auto-inicio.
- Imagen frontend staging: `sha256:c789faa7cde0a0cf28e111c98beebbf053cb0129d286f001c386dde20828b312`; gateway HTTP 200.
- Comparación cruda: [`comparison.json`](./comparison.json). Baseline heredado: [Spec 046, muestra 01](../../046-dashboard-gate-automatic-scheduling-queries/evidencia/runs/sample-01/dashboard-startup-api-requests.json), [02](../../046-dashboard-gate-automatic-scheduling-queries/evidencia/runs/sample-02/dashboard-startup-api-requests.json), [03](../../046-dashboard-gate-automatic-scheduling-queries/evidencia/runs/sample-03/dashboard-startup-api-requests.json). Corridas nuevas: [01](./runs/sample-01/dashboard-startup-api-requests.json), [02](./runs/sample-02/dashboard-startup-api-requests.json), [03](./runs/sample-03/dashboard-startup-api-requests.json).
