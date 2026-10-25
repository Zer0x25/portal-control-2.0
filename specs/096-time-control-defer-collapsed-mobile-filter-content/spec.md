# Spec 096: diferir filtros móviles contraídos

- Estado: Descartado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

En el viewport móvil de 412 px, `TimeRecordFilters` inicia contraído, pero aun
así monta los campos, opciones y hooks bajo una grilla CSS invisible. La query
grande de registros está deshabilitada mientras se cierra, aunque el componente
y sus controles siguen en el primer árbol React de Control horario. La línea
base de tres visitas frías cargó 67 recursos JavaScript y transfirió 200.553 B;
está guardada en
`../095-theme-bootstrap-idempotency/evidencia/time-control-route-chunk-waterfall.json`.

## Alcance

Dentro:

- Separar el contenido de los controles y cargarlo con `React.lazy` solo cuando
  se expanda la sección de filtros.
- Conservar el encabezado/periodo y el botón de expansión cuando está cerrada.
- Al abrir, preservar selects, rango rápido, fechas, acciones, opción de fecha
  máxima y activación de consultas.
- Medir tres visitas frías de staging y probar que abrir y usar los filtros
  sigue funcionando.

Fuera (explícito):

- Cambiar filtros, contratos API, orden de registros o el tamaño de página.
- Modificar `TimeControl.view.tsx` (`UI-PROTECTED`) o alterar el diseño visible
  en escritorio.
- Declarar mejora de TBT a partir de un menor número de módulos o nodos.

## Criterios de aceptación

- [x] AC1: En móvil contraído no se montan los campos ni se solicita el nuevo
      chunk de contenido. La query de registros usada por los filtros no se
      activa hasta expandirlos.
- [x] AC2: Al expandir, el chunk se solicita una sola vez, todos los filtros
      quedan accesibles y cambiar el rango o seleccionar una opción conserva el
      comportamiento actual.
- [x] AC3: En escritorio los controles siguen apareciendo al entrar a Control
      horario; en móvil se conserva el rótulo y el botón de expansión.
- [ ] AC4: Tres visitas frías móviles comparadas con la línea base reducen al
      menos 5 KB de transferencia JavaScript antes de abrir filtros, sin requests
      API adicionales. Las muestras CPU se reportan con sus límites y no se
      convierten automáticamente en una afirmación de TBT.

## Restricciones

La carga de filtros debe seguir limitada por el estado actual de expansión y no
debe cambiar el valor seleccionado ni el rango al cerrar y volver a abrir. El
fallback mientras carga el chunk debe ser accesible y no cubrir el encabezado.
Rollback: restaurar el contenido inline en `TimeRecordFilters.tsx` y retirar el
chunk lazy.

## Trazabilidad

- Pruebas del componente:
  `frontend/src/tests/components/time_control/TimeRecordFilters.spec.tsx`.
- E2E móvil y de rutas: `frontend/e2e/performance.spec.ts`.
- Evidencia final: `./evidencia/resultado.md`, auditoría de expansión, tres
  cascadas y perfil CPU posterior.
- Bitácora: `.jules/bolt.md`.
