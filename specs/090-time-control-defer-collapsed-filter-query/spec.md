# Spec 090: Diferir consulta de filtros colapsados en móvil

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

La navegación móvil de Control horario carga dos páginas distintas de
`/api/records`: la tabla y `TimeRecordFilters`. En móvil, los filtros parten
colapsados (`isExpanded=false`), pero `TimeRecordFilters` ejecuta su consulta de
50 registros aun cuando el panel está oculto. El perfil de producción posterior
a Spec 089 confirma 13 solicitudes por carga y dos lecturas de registros.

## Alcance

Dentro:

- Deshabilitar la consulta auxiliar de registros mientras los filtros móviles
  están colapsados.
- Activarla cuando el usuario expanda el panel y mantenerla activa en desktop,
  donde los filtros aparecen expandidos.
- Conservar sus parámetros actuales y no alterar la consulta paginada de la
  tabla.
- Medir el resultado en staging con tres perfiles de producción y cinco corridas
  Lighthouse frías.

Fuera (explícito):

- Cambiar `TimeControl.view.tsx`, que está marcada `UI-PROTECTED`.
- Cambiar endpoints, page size de tabla, filtros de negocio, permisos, API,
  Prisma o persistencia.
- Equiparar el tiempo del React Profiler de desarrollo con TBT o CPU de
  producción.

## Criterios de aceptación

- [x] AC1: La consulta auxiliar está deshabilitada en la carga móvil inicial,
      cuando el panel está colapsado, y habilitada al expandirlo.
- [x] AC2: En desktop la consulta sigue habilitada al montar, y la tabla mantiene
      sus filtros, tamaño de página y comportamiento.
- [x] AC3: Tres perfiles de producción muestran 13→12 solicitudes API y
      `/api/records` 2→1 por navegación móvil; no hay fallos en las respuestas.
- [x] AC4: Cinco corridas Lighthouse frías registran TBT/FCP/LCP frente a la
      imagen anterior; toda diferencia se describe sin atribución causal si los
      rangos se solapan.
- [x] AC5: Tests cubren panel móvil colapsado/expandido y desktop; no se modifica
      la vista protegida ni se escriben datos de negocio.

## Restricciones

TanStack Query sigue siendo dueño del estado remoto. Solo se controla `enabled`
en la llamada auxiliar de filtros. La consulta vuelve a habilitarse al abrir el
panel. No cambia el contrato de `useTimeRecords`.

## Trazabilidad

- Tests: `frontend/src/tests/components/time_control/TimeRecordFilters.spec.tsx`.
- Evidencia previa: `../089-time-control-defer-open-shift-reports/evidencia/time-control-production-cpu-after-2026-10-25.json`.
- Perfil React contextual: `./evidencia/time-control-react-startup-profile-2026-10-25.json`.
- Resultado final: `./evidencia/resultado.md`.
