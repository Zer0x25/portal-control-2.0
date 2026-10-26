# Spec 063: Defer User Directory For Shift Handover

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

El layout persistente monta `useLoginAutomations` en todas las rutas; ese hook activa `useUsers()` aunque el traspaso no aplique o no exista un cierre pendiente. En la nueva captura fría, `/api/users` entregó 636 bytes, pero ninguno de los tres contextos tenía cierres; la fase Usuarios midió 99,1–428,2 ms (mediana 263,1 ms). El registro agregado está en [baseline-2026-10-24.md](./evidencia/baseline-2026-10-24.md).

## Alcance

Dentro:

- Consultar informes de cierre solo cuando el rol puede mostrar el traspaso y la sesión aún no lo marcó como visto.
- Consultar el directorio de usuarios solo cuando existe un informe cerrado que requiere resolver el nombre, y solo para roles autorizados por el endpoint. Los consumidores generales de `useEmployees` no activan esa lista; `archiveEmployee` la solicita explícitamente cuando necesita ubicar una cuenta vinculada.
- Esperar a que el informe termine de cargar antes de marcar el traspaso como visto, y preservar el nombre de usuario como fallback.
- Registrar en el probe de rendimiento solo bytes de respuesta y un booleano que indique si hay un cierre pendiente; nunca guardar cuerpos ni datos de usuarios.

Fuera (explícito):

- Cambiar permisos, contratos HTTP, el modelo de informes, el orden general de sincronización o la persistencia de usuarios.
- Cambiar la consulta de Usuarios en las pantallas que gestionan el directorio.
- Cambiar la política funcional de una sesión que ya vio el traspaso.

## Criterios de aceptación

- [x] AC1: Si el rol no participa del traspaso, la sesión ya lo vio o no hay informe cerrado después de cargar informes, el layout y los consumidores generales de `useEmployees` no inician `/api/users`; archivar empleados carga explícitamente la lista antes de buscar la cuenta vinculada.
- [x] AC2: Si hay informe cerrado y pendiente, el traspaso se muestra una vez cargados los datos necesarios; roles sin permiso de lectura del directorio muestran el nombre de usuario del informe y no reciben una petición 403 a `/api/users`.
- [x] AC3: El probe de tres contextos fríos registra bytes de `/api/users` y solo el booleano de cierre pendiente; no guarda cuerpos, nombres, IDs ni tokens. Compara la fase Usuarios y el overlay con Spec 062 e informa cualquier cambio sin atribuir causalidad a muestras insuficientes.
- [x] AC4: Tests unitarios, typecheck, lint, `spec:check`, `docs:check` y preflight pasan; el staging reconstruido termina saludable y la regresión de handover queda cubierta.

## Restricciones

Fastify continúa como único servidor HTTP. No hay cambio de contrato ni ADR. Los queries siguen bajo las raíces canónicas y sensibles existentes. El fallback del modal es el `responsibleUser` ya presente en el informe. Rollback: restaurar el consumo incondicional de `useUsers()` y la activación original de `useReportsQuery` en `useLoginAutomations`.

## Trazabilidad

- Tests que lo probarán: `frontend/src/tests/hooks/useLoginAutomations.test.tsx`, `frontend/src/tests/hooks/useEmployeesQueryGating.test.tsx`, prueba de archivado y probe `frontend/e2e/performance.spec.ts`.
- Docs a actualizar: [baseline](./evidencia/baseline-2026-10-24.md), [resultado](./evidencia/resultado-2026-10-24.md) y `.jules/bolt.md`.
- Evidencia previa: `../062-lightweight-health-readiness-for-frontend-startup/evidencia/resultado-2026-10-24.md`.
