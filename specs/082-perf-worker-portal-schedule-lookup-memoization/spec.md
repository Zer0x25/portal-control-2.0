# Spec 082: estabilizar el lookup de turnos del Worker Portal

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

El bundle compilado de `useScheduling` muestra que el mapa de permisos y
`getEmployeeDailyScheduleInfo` se recrean en cada render. Para el rol Usuario,
la query de permisos está deshabilitada y `extractLeaves(undefined)` devuelve un
array nuevo; el mapa agrupado tampoco queda memoizado. Worker Portal usa el
helper como dependencia de `enrichedRecords`, por lo que estados de queries de
planificación no relacionados pueden repetir el enriquecimiento de todos los
registros del mes.

## Alcance

Dentro:

- Mantener una referencia vacía estable cuando no hay datos de permisos.
- Memoizar el mapa de permisos y el helper de búsqueda según cambien sus datos.
- Probar que cambios de estado de query sin cambios de datos conservan la
  referencia del helper.
- Repetir el perfil frío del Worker Portal y registrar el resultado.

Fuera (explícito):

- Cambiar el resultado de negocio del cálculo de turnos, permisos o feriados.
- Editar `WorkerPortal.view.tsx`, marcado `UI-PROTECTED`.
- Modificar API, sincronización de datos o servicios de staging.
- Atribuir timings de React Profiler en Vite dev a producción o CWV.

## Criterios de aceptación

- [x] AC1: Si las colecciones de planificación no cambian, cambios de estado de query no recrean `getEmployeeDailyScheduleInfo`.
- [x] AC2: El helper cambia de referencia cuando cambian colecciones fuente de empleados o permisos.
- [x] AC3: Tres perfiles fríos mantienen las medianas de commits de ruta/vista y guardan eventos completos; no se exige mejora en timings Vite dev.
- [x] AC4: El resultado documenta métricas, límites del profiler y la salud/digest intactos de staging.
- [x] AC5: Tests dirigidos, frontend check/lint/build y preflight local pasan antes del commit.

## Restricciones

- Los mapas solo se reutilizan mientras sus colecciones fuente mantengan la
  misma referencia.
- El test de identidad no sustituye los tests de reglas de negocio existentes.
- El perfil local apunta al staging por el proxy `/api`, sin ejecutar
  mutaciones.

## Trazabilidad

- Evidencia de implementación React Compiler: inspección local del bundle generado, no se publica.
- Baseline: `./evidencia/worker-portal-baseline-render-profile-2026-10-24.json`.
- Perfil posterior: `./evidencia/worker-portal-render-profile-2026-10-24.json`.
