# Spec 089: diferir informes de turno en Control horario

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

El perfil de producción de Control horario observa dos solicitudes a
`/api/shift-reports` por navegación (6 en tres muestras). Una corresponde a
`useReportsQuery({ status: "open" })` en `useTimeControlModals`; esa colección
solo se consulta al agregar una novedad, pero hoy se carga al montar la ruta.
La carga fría actual tiene 14 solicitudes y TBT Lighthouse mediano de 239 ms.

## Alcance

Dentro:

- No solicitar los informes abiertos al montar Control horario.
- Consultarlos al pulsar la acción de agregar novedad y conservar el flujo
  cuando existe un turno abierto o cuando no existe.
- Medir el número de solicitudes y el perfil frío; comparar Lighthouse con la
  línea actual sin atribuir causalidad a una única muestra.

Fuera (explícito):

- Cambiar los datos o permisos de informes, endpoints, OpenAPI/SDK, backend o
  migraciones.
- Diferir las consultas compartidas del shell o cambiar el comportamiento de
  otras rutas.

## Criterios de aceptación

- [x] AC1: El perfil de producción de tres navegaciones identifica dos
      solicitudes `/api/shift-reports` por carga y el call site de informes
      abiertos solo los usa en la acción de agregar novedad.
- [x] AC2: Al abrir Control horario, el hook no dispara la consulta de informes
      abiertos; el conteo baja de 14 a 13 solicitudes por carga y el resto de
      los endpoints de ruta sigue respondiendo sin fallos.
- [x] AC3: Al agregar una novedad, se refrescan los informes abiertos antes de
      poblar el borrador de novedad; si hay turno activo se conserva el estado
      del borrador y si no lo hay se mantiene el aviso existente.
- [x] AC4: Si falla esa consulta, se muestra un error de carga y no se presenta
      el estado como si no existiera un turno activo.
- [x] AC5: Cinco mediciones Lighthouse frías registran TBT, FCP y LCP frente a
      la mediana actual de 239 ms; se informa el resultado observado sin
      adjudicar al cambio una diferencia que no respalden las muestras.

## Restricciones

Mantener TanStack Query como dueño del estado remoto y el cliente HTTP
`apiClient`. No cambiar contratos ni permisos. El rollback consiste en quitar
`enabled: false` y restaurar el consumo directo de la consulta al montar.

## Trazabilidad

- Tests: `frontend/src/tests/features/time-control/useTimeControlModals.test.ts`.
- Evidencia inicial: `../088-time-control-scheduling-query-scope/evidencia/time-control-production-cpu-after-2026-10-25.json`.
- Resultado final: `./evidencia/resultado.md`.
