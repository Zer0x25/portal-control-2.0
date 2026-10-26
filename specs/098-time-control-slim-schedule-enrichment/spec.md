# Spec 098: Time Control Slim Schedule Enrichment

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

La ruta de Control horario solo consume `getEmployeeDailyScheduleInfo` del hook
`useScheduling`, pero `queryMode: "schedule-enrichment"` todavía monta hooks de
configuración, directorio de empleados, correcciones y mutaciones deshabilitados
en `frontend/src/hooks/useScheduling.ts:78-113`. El perfil de Spec 097 mantiene
12 requests por ruta y atribuye CPU repartido entre React, DOM y API; el trabajo
debe reducirse eliminando lógica no usada sin tocar los cuatro datasets de
enriquecimiento ni cambiar la vista protegida.

## Alcance

Dentro:

- Sustituir el `useScheduling` completo en Control horario por un hook enfocado
  en turnos, asignaciones, feriados y permisos.
- Reutilizar una sola implementación del cálculo diario entre ambos hooks.
- Comparar cinco corridas Lighthouse frías y tres perfiles CPU en la misma
  configuración de staging antes y después.

Fuera (explícito):

- Cambiar comportamiento del cálculo, endpoints, cache, claves de query o
  contratos.
- Editar `TimeControl.view.tsx` (`UI-PROTECTED`) o cambiar UI.
- Conservar el refactor si no cumple el umbral de rendimiento definido abajo.

## Criterios de aceptación

Criterios de aceptación verificables, uno por línea, estilo Given/When/Then
o checklist medible:

- [x] AC1: El hook especializado usa solo las cuatro queries requeridas; no
      monta queries de configuración/empleados/correcciones ni hooks de
      mutación que `useTimeControl` no consume.
- [x] AC2: Pruebas de los casos de permiso, feriado, sin asignación, patrón
      inválido, día libre y turno programado confirman el mismo resultado que la
      lógica actual; las pruebas existentes de `useScheduling` siguen pasando.
- [x] AC3: En cinco corridas Lighthouse frías bajo idéntica configuración, el
      TBT mediano baja al menos 20% o queda bajo 200 ms, y el LCP no empeora más
      de 5%; si no cumple, se revierte el refactor y se marca descartado.
- [x] AC4: Tres perfiles CPU y tres visitas funcionales en staging conservan
      el reloj, la tabla y las 12 requests API existentes, todas HTTP 200, sin
      consultas adicionales.

## Restricciones

Constitución I–V; mantener TanStack Query como dueño de estado remoto, evitar
duplicar el cálculo y conservar claves/cache/endpoints. Rollback: restaurar el
uso de `useScheduling` en `useTimeControl.ts` y retirar el hook especializado.

## Trazabilidad

- Tests que lo probarán: `useTimeControl.test.ts`, un test del hook de
  enriquecimiento y pruebas existentes de `useScheduling`.
- Docs a actualizar: resultado de evidencia y `.jules/bolt.md`.
