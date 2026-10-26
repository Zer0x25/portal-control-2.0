# Spec 054: Time Control Defer Virtualized Table

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

La carga fría de Control horario descarga `tables-BIkCK_wm.js` (53.5 KB sin comprimir) y `TimeRecordTableViewDesktop` (18.8 KB) antes de que la persona llegue a la tabla. El trace de staging mostró estos chunks incluso con una tabla sin filas, mientras el bloque de registros comienza debajo del pliegue en móvil.

## Alcance

Dentro:

- Diferir el módulo pesado de la tabla hasta que su zona se acerque al viewport.
- Mostrar un fallback con espacio reservado mientras el módulo no se haya solicitado.
- Medir que el chunk no se solicita en frío y sí al desplazarse hasta la tabla; comparar carga fría en staging.

Fuera (explícito):

- Cambiar virtualización, páginas, filtros, filas, servicios/API, comportamiento de exportación o datos.
- Diferir la tabla en escritorio si ya está dentro del viewport inicial.
- Exigir una mejora fija de TBT; el cambio busca retirar JS fuera de pantalla del camino inicial y se medirán sus efectos reales.

## Criterios de aceptación

- [x] AC1: En viewport móvil, la ruta fría no solicita los chunks de `TimeRecordTableViewMobile` ni `tables` mientras la tabla está fuera del viewport.
- [x] AC2: Al desplazarse hasta la zona de registros, se solicitan los chunks necesarios y la vista móvil de tabla aparece con sus controles o estado vacío.
- [x] AC3: El fallback reserva altura estable y el perfil frío de Control horario conserva tres muestras Lighthouse válidas con ruta/rol correctos; se guardan las medianas antes y después.
- [x] AC4: No cambian contratos ni comportamiento de tabla; pasan los checks frontend y de gobernanza.

## Restricciones

- El gate de viewport es de una sola activación; al entrar, la tabla permanece montada al seguir navegando.
- Si `IntersectionObserver` no está disponible, cargar la tabla inmediatamente como fallback funcional.
- La prueba de staging es de solo lectura y no depende de filas editables.

## Trazabilidad

- Tests que lo probarán: Playwright en `frontend/e2e/performance.spec.ts`; tests unitarios del wrapper cubren activación por intersección y fallback sin `IntersectionObserver`.
- Docs a actualizar: JSON y evidencia comparativa de Spec 039; resultado de esta spec.
