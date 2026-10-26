# Spec 106: Evitar sincronizaciones redundantes del filtro rápido

- Estado: Implementado (2026-10-26)
- Autor: zer0x
- Fecha: 2026-10-26
- ADR relacionado: N/A

## Problema

`useTimeRecordFilters` inicializa los rangos de fecha y, al montar, un efecto
vuelve a guardarlos aunque tengan los mismos valores. El mismo patrón se repite
al pulsar un filtro rápido porque el manejador ya actualiza ambos rangos antes
de que el efecto los sincronice de nuevo. La prueba de render cuenta dos
renders en ambos casos; el perfil React de desarrollo de la ruta también
registró 3 commits del scope `time-control:filters` en las tres muestras.

En el perfil base de esta spec, el scope registró 3 commits en las tres
muestras y una duración mediana de 39,7 ms (rango 35,3–43,8 ms) bajo CPU 4×.
Es una medida de atribución en desarrollo, no TBT de producción. El objetivo
es eliminar las escrituras duplicadas y medir su efecto sin atribuirle una
mejora global de Core Web Vitals.

## Alcance

Dentro:

- Evitar que el efecto de sincronización vuelva a guardar rangos activos que ya
  coinciden por `is24h`, `desde` y `hasta`.
- Conservar la actualización cuando cambia la fecha de negocio y el filtro
  rápido activo requiere un rango distinto.
- Probar renders, fechas aplicadas y filtros personalizados con tests de hook.
- Repetir tres perfiles React de desarrollo de `/#/time-control` con viewport
  móvil y CPU 4× para comprobar el conteo de commits del scope.

Fuera (explícito):

- Editar `TimeControl.view.tsx`, protegida por UI-PROTECTED.
- Cambiar claves, políticas o datos de consultas, APIs, IndexedDB, permisos,
  marcaciones o el comportamiento de filtros personalizados.
- Afirmar mejora de TBT, INP, latencia API o producción a partir de perfiles de
  React en desarrollo.

## Criterios de aceptación

- [x] AC1: El test reproduce dos renders antes del cambio al montar y al elegir
      un filtro distinto, y un render al volver a elegir el filtro activo. La
      implementación reduce montaje/selección a un render y la repetición a
      cero, preservando los rangos seleccionados y aplicados.
- [x] AC2: Al cambiar la fecha de negocio se actualizan los rangos del filtro
      rápido activo; un rango idéntico no produce otra actualización. Los
      filtros personalizados y el estado de aplicación conservan su contrato.
- [x] AC3: Tres perfiles antes/después guardan conteos y duraciones de
      `time-control:filters` y del scope de ruta antes/después; el informe
      distingue commits React de métricas de producción, registra un commit
      menos del scope en las tres muestras y no atribuye mejora de duración o TBT.
- [x] AC4: Tests focalizados, TypeScript, lint focalizado, build, chequeo de
      specs y preflight pasan; staging se verifica `healthy` con el build
      candidato y sin escrituras de datos de negocio.

## Restricciones

Constitución I–V. No hay cambios de API, OpenAPI, SDK, Prisma ni migraciones.
El rollback consiste en revertir el guard del hook si cambia el rango
seleccionado, agrega commits o afecta la aplicación de filtros.

## Trazabilidad

- Tests: `frontend/src/tests/features/time-control/useTimeRecordFilters.test.tsx`.
- Perfil: `frontend/scripts/measure-renders.mjs` con ruta `time-control`, tres
  muestras, viewport móvil y CPU 4×.
- Evidencia final: `./evidencia/resultado.md` y perfiles comparables.
- Bitácora: `.jules/bolt.md`.
