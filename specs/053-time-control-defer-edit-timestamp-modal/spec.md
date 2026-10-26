# Spec 053: Time Control Defer Edit Timestamp Modal

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

El trace frío de Control horario registró 55.3–55.7 KB de JavaScript no usado y 1,658–1,710 ms de demora de render del LCP. La vista montaba `EditTimestampModal` aunque `editingRecordInfo` fuera `null`; React.lazy solicitaba su chunk `EditTimestampModal.container` al abrir la ruta, aunque el modal no mostraba contenido.

## Alcance

Dentro:

- Evitar que Control horario monte o descargue el editor de marcaje hasta que el usuario elija editar un registro.
- Cargar el módulo de edición directamente desde su archivo, sin pasar por el barrel del feature.
- Añadir una comprobación Playwright de solicitud inicial y una prueba de vista del estado abierto; guardar la medición de staging.

Fuera (explícito):

- Cambios al formulario, reglas de edición, API, consultas de registros, tabla virtualizada o chunks compartidos.
- Prometer una reducción fija de LCP/TBT sin evidencia de staging.

## Criterios de aceptación

- [x] AC1: En una carga fría de `/#/time-control`, el navegador no solicita el chunk `EditTimestampModal.container`.
- [x] AC2: Cuando `editingRecordInfo` pasa de `null` a un registro, la vista monta el modal y muestra “Seleccione Nueva Hora”; el estado cerrado no monta el modal.
- [x] AC3: La batería de staging completa tres muestras Lighthouse móviles válidas de Control horario y registra mediana FCP/LCP/TBT, JavaScript transferido y solicitudes antes y después.
- [x] AC4: Se conservan las rutas, contratos y reglas actuales de edición; pasan los checks frontend y de gobernanza.

## Restricciones

- Mantener el límite HTML/CSS existente y no introducir dependencias de runtime.
- La ruta continúa usando `React.lazy` + `Suspense`; el editor y sus dependencias permanecen funcionales bajo demanda.
- La prueba de staging es solo de lectura. Si no hay registros editables, Vitest valida que el modal aparece cuando la vista recibe el estado de edición.

## Trazabilidad

- Tests que lo probaron: Playwright en `frontend/e2e/performance.spec.ts` para solicitudes en frío; Vitest `TimeControlView.test.tsx` para estados cerrado/abierto del editor.
- Docs a actualizar: evidencia de Spec 039 y cierre de esta spec con el JSON de la batería.
