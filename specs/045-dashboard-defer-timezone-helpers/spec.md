# Spec 045: Defer Dashboard Timezone Helpers

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-23
- ADR relacionado: N/A

## Problema

En las tres capturas frías de la spec 044, el Dashboard pidió 76 scripts y Lighthouse atribuyó una mediana de 974,70 ms de CPU al paquete React. Un perfil CDP de diagnóstico con CPU 4× identificó además 105,62 ms de ejecución propia en `date-utils-DTu9wXYq.js` (36 KB descomprimidos, 12 KB transferidos). `useEmployees` usa `toBusinessDateChile` solo al archivar; `useShiftManager` usa `formatTime` y `toBusinessDateChile` solo al iniciar un turno; y el shell importa `useScheduling`, cuyo cálculo síncrono de días arrastra `date-fns-tz` aunque no requiere zonas horarias. La descarga y ejecución ocurren antes de usar cualquiera de esas acciones.

## Alcance

Dentro:

- Sacar del grafo inicial del Dashboard las utilidades de fecha y formato que solo se necesitan al archivar empleados o crear un turno.
- Conservar el cálculo síncrono del calendario de turnos sin cargar `date-fns-tz`.
- Agregar regresiones de carga de chunks y aritmética de fechas, y comparar la carga fría en staging local.

Fuera (explícito):

- Cambiar formatos visibles, semántica de fechas de negocio, queries, API, presupuesto de bundle o configuración de precache.
- Atribuir una mejora de LCP a un solo cambio sin resultados repetidos que la respalden.

## Criterios de aceptación

- [x] AC1: Dado un Dashboard frío en staging, al cargarlo no se solicitan los chunks `date-utils`, `dateUtils` ni `formatters`; las pruebas de acciones confirman que se cargan al invocarlas.
- [x] AC2: Dadas fechas ISO válidas consecutivas, el cálculo síncrono de días conserva intervalos de 24 horas incluso al cruzar el cambio DST de Chile y rechaza fechas inválidas.
- [x] AC3: El flujo de inicio de turno y archivo conserva el mismo formato de fecha/hora al cargar las utilidades en el momento de uso.
- [x] AC4: Tres capturas frías en staging documentan solicitudes/transferencia JavaScript y LCP/FCP/TBT/CLS antes y después, sin declarar mejora de CWV si los rangos se solapan.

## Restricciones

- Sin cambio de contrato HTTP, persistencia, formato visible ni UI protegida.
- Los imports dinámicos mantienen el cache nativo del módulo; cada helper se carga una sola vez al primer uso.
- Revertir el cambio restaura los imports estáticos sin afectar contratos.

## Trazabilidad

- Evidencia base: `../044-dashboard-welcome-early-render/evidencia/lighthouse-cold-profile.json`.
- Perfil CDP base: una corrida de diagnóstico sobre la imagen local de la spec 044; no es muestra estadística ni reemplaza Lighthouse.
- Tests: `frontend/e2e/performance.spec.ts`, `frontend/src/utils/dateOnly.test.ts`, `frontend/src/tests/hooks/useEmployeesArchiveLazyDate.test.tsx` y `frontend/src/tests/hooks/useShiftManagerLazyDates.test.tsx`.
- Registro de salida: `evidencia/resultado-2026-10-23.md` y perfiles LHCI.
