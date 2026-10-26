# Spec 070: atribuir updates del shell durante readiness

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

Spec 069 detectó tres commits de scopes de aplicación durante cada
`validateInstanceId`, mientras `time-control` y `time-control:view` no tuvieron
commits en esa ventana. Los scopes de Spec 069 abarcan demasiado para distinguir
la persistencia de queries, el router, el overlay de sincronización y las rutas.

## Alcance

Dentro:

- Medir por separado `App`, persistencia de Query, router, overlay inicial,
  indicadores globales, toasts, notificador de acceso y rutas.
- Construir los límites React Profiler solo en Vite development, sin agregar
  wrappers de React al árbol de producción.
- Correlacionar scopes con la validación y lectura del cuerpo JSON usando el
  recolector existente, sin solicitudes ni query markers adicionales.
- Repetir tres contextos fríos de Time Control a 412×823 y CPU 4× contra la API
  local de staging.
- Elegir el subárbol que merezca una medición más fina o dejar documentado el
  siguiente método si ninguno concentra el trabajo.

Fuera (explícito):

- Cambiar hooks, estado, consultas, sincronización, UI o comportamiento del
  router.
- Comparar duraciones de Profiler dev con producción o declarar mejoras de CWV.
- Guardar credenciales, tokens, contenido de respuestas o identificadores de
  usuario.

## Criterios de aceptación

- [x] AC1: El perfil cubre `app:application`, `app:query-cache-provider`,
      `app:router`, `app:initial-sync-overlay`, los indicadores/toasts/notificador
      y `app:routes`; los callbacks siguen acotados por el límite de eventos.
- [x] AC2: Tres contextos guardan por muestra validación, lectura JSON y
      commits solapados por scope; no se descartan eventos.
- [x] AC3: El informe ofrece min/mediana/máx. y no suma scopes anidados.
- [x] AC4: Los perfiles se montan solo en desarrollo; el build de producción no
      contiene callbacks/buffer del Profiler y reduce la envoltura a devolver el hijo.
- [x] AC5: Se elige un candidato de atribución o se registra el método siguiente,
      sin cambiar comportamiento funcional.

## Restricciones

React Profiler agrega overhead en desarrollo y `actualDuration` no representa el
tiempo completo de una espera asíncrona. Los límites padres e hijos describen
parte del mismo árbol; comparar scopes no significa sumar sus duraciones.

## Trazabilidad

- Código: `frontend/src/App.tsx`, `frontend/src/contexts/AppProviders.tsx`,
  `frontend/src/main.tsx` y `frontend/src/utils/RenderProfiler.tsx`.
- Antecedentes: Specs 067, 068 y 069.
- Evidencia: `evidencia/react-shell-readiness-profile-2026-10-24.json` y
  `evidencia/resultado-2026-10-24.md`.
- Bitácora: `.jules/bolt.md`.
