# Spec 078: reutilizar el formateador de meses de Worker Portal

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

Spec 077 atribuyó a `useWorkerPortalData.ts:154` una mediana de 15,708 ms de
CPU propio por carga, en 3/3 contextos fríos con CPU 4×. Ese `useMemo` crea 12
opciones de mes y llama a `Date.toLocaleString` con la misma configuración en
cada iteración. Es un costo pequeño (2,4% de CPU activo mediano), por lo que el
cambio solo se conservará si una repetición comparable muestra al menos 20% de
reducción.

## Alcance

Dentro:

- Reutilizar un `Intl.DateTimeFormat` durante la creación de las 12 etiquetas.
- Preservar los valores, orden y etiquetas `es-CL` del selector de mes.
- Medir el mismo flujo frío Worker en staging y registrar el resultado, incluso
  si no alcanza el umbral y se revierte.

Fuera (explícito):

- Cambiar consultas, datos, filtros, selector visual, API, backend o SQLite.
- Afirmar una mejora de LCP/TBT por una mejora pequeña de CPU muestreada.
- Modificar otra ruta o una dependencia.

## Criterios de aceptación

- [x] AC1: La prueba de hook comprueba que las 12 opciones mantienen los mismos
      valores `YYYY-MM`, orden newest-first y etiquetas que el formato previo,
      incluyendo un cambio de año.
- [x] AC2: El callback usa una sola instancia de `Intl.DateTimeFormat` para las
      12 fechas; no se mueve la construcción al scope del módulo.
- [x] AC3: Tres perfiles fríos en Chromium sobre el bundle activo de staging,
      viewport 412×823 y CPU 4×, muestran una mediana de tiempo propio muestreado detectado en
      `useWorkerPortalData.ts` al menos 20% menor que la mediana base de
      15,708 ms de Spec 077; se informa cuántos contextos detectan el frame;
      si no, se revierte el cambio y se documenta como descartado.
- [x] AC4: Staging sirve los assets del build candidato, el reloj real aparece
      en 3/3, el selector conserva 12 opciones, no hay respuestas API fallidas ni
      errores de WebSocket, y la prueba no ejecuta mutaciones.
- [x] AC5: Solo se reconstruye el servicio frontend; la imagen backend, base de
      datos y volúmenes permanecen intactos.
- [x] AC6: `spec:check`, `docs:check`, Prettier, frontend lint/typecheck,
      `git diff --check` y preflight pasan antes del commit.

## Restricciones

- La medición de Chromium sirve para atribución; no se compara numéricamente con
  Lighthouse, Vite dev ni otra configuración de CPU.
- El perfil de aceptación debe confirmar paridad exacta de los scripts servidos
  por staging con el build candidato, sin servir source maps desde el contenedor.
- Si el muestreo no reduce al menos 20% la función objetivo, se revierte el
  código y se reconstruye el frontend de staging desde el commit `6936a2f`.

## Trazabilidad

- Base de medición: [resultado Spec 077](../077-worker-portal-production-cpu-attribution/evidencia/resultado-2026-10-24.md).
- Runner de perfil: `frontend/scripts/profile-worker-production.mjs`.
- Test funcional: `frontend/src/tests/features/worker-portal/useWorkerPortalData.test.tsx`.
- Evidencia final: `./evidencia/resultado-2026-10-24.md` y el perfil de CPU.
