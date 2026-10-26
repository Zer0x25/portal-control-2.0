# Spec 069: Correlacionar commits React con readiness

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

Spec 068 encontró el ciclo de trabajo del scheduler de React durante la
validación, pero el perfil de producción no identifica el componente que
origina esos commits. El repo ya tiene `RenderProfiler` y un runner de
desarrollo, aunque solo guardan totales del primer segundo y no correlacionan
commits con las marcas de readiness.

## Alcance

Dentro:

- Guardar `startTime`, `commitTime`, fase y duración por callback React
  Profiler, solo en modo desarrollo y con límite de eventos por página; incluye
  un scope raíz anterior a `AppProviders` para observar el trabajo previo a la
  ruta.
- En la ruta Time Control, activar las marcas optativas de sync/readiness sin
  añadir query markers ni requests.
- Separar `app:root`, `app:providers`, `app:shell`, `time-control` y
  `time-control:view`; correlacionar sus commits con la ventana de lectura JSON
  y la fase `validateInstanceId`.
- Ejecutar tres contextos fríos contra Vite local (CPU 4×) y la API read-only
  de staging, para aproximar el throttle del probe de producción.
- Usar los tiempos de desarrollo solo para localizar subárboles, sin
  compararlos con métricas de producción.

Fuera (explícito):

- Cambiar componentes, consultas, flujo de sincronización o UI.
- Habilitar React Profiler en builds de producción.
- Guardar tokens, sesiones, datos de usuario, URLs/query o payloads.
- Afirmar que una correlación de commits demuestra causalidad o mejora de CWV.

## Criterios de aceptación

- [x] AC1: Tres contextos de Time Control guardan los commits React de la raíz,
      providers, shell, ruta y vista con scope, fase y marcas temporales; los
      eventos se limitan al número máximo definido.
- [x] AC2: El informe incluye por muestra las marcas de validación, readiness
      y resolución del cuerpo JSON, y separa los commits que se solapan con esa
      ventana para `app:root`, `app:providers`, `app:shell`, `time-control` y
      `time-control:view`.
- [x] AC3: Se presentan min/mediana/máx. de commits y duración React por scope,
      junto al número de commits que se solapan con lectura JSON; los scopes
      anidados no se suman entre sí.
- [x] AC4: El perfil solo opera en Vite development; sin diagnóstico no hay
      query marker, request adicional ni cambio al runtime de producción.
- [x] AC5: Se decide si hay un subárbol candidato para revisar; si la captura no
      es concluyente, queda registrado el siguiente método de medición.

## Restricciones

React Profiler en desarrollo añade overhead y sus duraciones no son comparables
con los perfiles CPU de staging. `actualDuration` por commit se informa por
scope y no se suman scopes anidados. Las marcas monotónicas de la página sirven
para correlación temporal; no guardan contenido de solicitudes.

## Trazabilidad

- Código: `frontend/src/main.tsx`, `frontend/src/utils/RenderProfiler.tsx` y
  `frontend/scripts/measure-renders.mjs`.
- Antecedentes: Specs 055, 067 y 068.
- Evidencia: `evidencia/react-readiness-render-profile-2026-10-24.json`.
- Bitácora: `.jules/bolt.md`.
