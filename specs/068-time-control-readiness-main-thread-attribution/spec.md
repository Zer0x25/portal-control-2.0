# Spec 068: Atribución del hilo principal durante readiness

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

Spec 067 midió 271,1 ms de mediana en `Response.json()` para un cuerpo de
readiness de 95 bytes. Las long tasks explicaron cerca de 97,4 ms de la
validación, pero el reporte no identifica qué scripts ocuparon esos frames. No
hay evidencia suficiente para cambiar `apiClient`, el endpoint o la validación.

## Alcance

Dentro:

- Extender el probe Playwright opt-in para observar entradas
  `long-animation-frame` durante tres contextos fríos de Control de Horario.
- Relacionar sus scripts con la ventana entre la resolución de `fetch()` y la
  lectura del cuerpo JSON, además del intervalo completo de validación.
- Guardar duración, tiempo bloqueante, nombre de función, invocador y solo el
  pathname saneado del script (sin origen, query ni fragmento).
- Determinar si hay una fuente de trabajo JavaScript que justifique un cambio
  de código o si el siguiente paso requiere otra clase de medición.

Fuera (explícito):

- Cambiar comportamiento de producción, HTTP, consultas o prioridad de tareas.
- Guardar cuerpos, headers, URLs completas, tokens, IDs de usuario/instancia o
  información de sesión.
- Afirmar causalidad o mejora con tres muestras.

## Criterios de aceptación

- [x] AC1: El probe registra por muestra si Chromium soporta
      `long-animation-frame` y captura las entradas disponibles que se solapan
      con `validateInstanceId` y la lectura del cuerpo JSON.
- [x] AC2: Cada campo de ruta de script conserva solo su pathname y atributos
      permitidos; no conserva el origen/query/fragmento de `sourceURL`, cuerpos
      HTTP ni datos de sesión.
- [x] AC3: El resultado resume frames y scripts con min/mediana/máx. de duración
      o frecuencia, relacionándolos con el tiempo de validación y lectura JSON,
      sin atribuir causalidad no demostrada.
- [x] AC4: La instrumentación solo captura cuando está activo
      `__PORTAL_SYNC_PERF_DIAGNOSTICS__`; no agrega solicitudes ni cambia el
      camino normal del cliente.
- [x] AC5: La siguiente oportunidad se decide a partir de scripts medidos; si
      no hay atribución concluyente, se registra la limitación y se propone el
      siguiente método de perfilado.

## Restricciones

Usar `PerformanceObserver` con detección de soporte. Mantener el probe en la
batería Playwright existente, CPU 4× y viewport 412×823. No persistir la URL
fuente original; el path se extrae con `URL.pathname`. Las entradas LoAF
describen frames largos y no representan por sí solas causalidad de la espera
observada en `Response.json()`.

## Trazabilidad

- Test principal: `frontend/e2e/performance.spec.ts`, test de tiempos de sync
  inicial de Time Control.
- Base: `specs/067-time-control-instance-validation-breakdown/`.
- Evidencia final: `evidencia/final/time-control-main-thread-attribution.json`.
- Bitácora: `.jules/bolt.md`.
