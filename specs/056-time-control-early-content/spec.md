# Spec 056: Time Control Early Content

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

En la carga inicial de Control horario, `useTimeControlData` mantiene `isPageLoading`
activo mientras llegan las marcaciones y `TimeControl.view.tsx` reemplaza toda la
página por un spinner, incluida la cabecera independiente de esos datos. La corrida
fría anterior registró LCP observado mediano de 1.661 s y retraso del elemento de
1.658 s; el perfil React de Spec 055 encontró 64,3 ms acumulados en el primer
segundo de desarrollo, por lo que el bloqueo de visibilidad es un candidato que se
puede probar sin tocar la vista protegida.

## Alcance

Dentro:

- Mostrar la estructura de Control horario una vez que la configuración necesaria para el panel de marcaje esté lista, aunque la consulta de registros siga cargando.
- Mantener la carga de registros indicada al componente de tabla y conservar sus estados vacíos y de error.
- Medir la ruta fría reconstruida en staging y documentar si mejora LCP/TBT.

Fuera (explícito):

- Cambiar `TimeControl.view.tsx`, la lógica de marcaje, filtros, contratos HTTP o datos de staging.
- Ocultar la espera de configuración que determina si se habilita la consola de marcaje.
- Declarar una mejora Lighthouse con una sola muestra o con rangos solapados.

## Criterios de aceptación

Criterios de aceptación verificables, uno por línea, estilo Given/When/Then
o checklist medible:

- [x] AC1: Con registros cargando y configuración lista, `isPageLoading` es `false`, por lo que la cabecera puede pintarse mientras la tabla recibe `isLoading=true`.
- [x] AC2: Con configuración todavía cargando, `isPageLoading` permanece `true`; la consola no se muestra con configuración sin resolver.
- [x] AC3: Las pruebas de hook y vista prueban ambos estados y staging muestra la cabecera mientras GET `/api/records` sigue pendiente, sin modificar `TimeControl.view.tsx`.
- [x] AC4: La batería fría post-rebuild guarda tres muestras de Control horario y reporta LCP, TBT y retraso observado sin mezclar perfil desarrollo con producción.
- [x] AC5: Typecheck, lint, validaciones de gobernanza y el flujo de staging pasan.

## Restricciones

- `TimeControl.view.tsx` está marcada `UI-PROTECTED`; no se edita.
- No cambia el contrato del hook: `isLoading` sigue señalando carga de registros y `isPageLoading` sigue siendo el gate de configuración.
- No cambia API, SDK, base de datos ni datos de negocio. Rollback: restaurar el predicado previo en `useTimeControlData`.

## Trazabilidad

- Tests enfocados: `useTimeControlData.test.ts` y `TimeControlView.test.tsx`.
- Evidencia de producción: `./evidencia/` y `./resultado.md`.
