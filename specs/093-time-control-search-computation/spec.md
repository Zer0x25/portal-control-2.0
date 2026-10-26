# Spec 093: diferir el cálculo de resultados del buscador de marcaje

- Estado: Completado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

El perfil de producción más reciente de Control horario muestra trabajo del
callback anónimo de `useClockingPanel.ts` dentro de tareas largas en 2 de 3
muestras: 21,505 ms de CPU muestreado mediano en ese contexto. El hook filtra,
normaliza y ordena la lista completa de empleados aun con el buscador vacío o
con un empleado ya seleccionado. En esos estados, `ClockingPanel` no presenta
la lista de resultados.

La consulta de opciones de empleados no se puede diferir globalmente: el shell
la utiliza para comprobar si debe ejecutar el auto inicio de jornada. El perfil
exploratorio de esta spec confirmó que la API seguía solicitándose en 3/3
muestras; el gate local del hook de búsqueda no eliminó esa solicitud.

## Alcance

Dentro:

- Evitar filtrar y ordenar empleados cuando no hay texto de búsqueda o ya hay
  una selección, que son estados en los que la lista no se muestra.
- Mantener normalización sin tildes, orden alfabético, selección y acciones de
  marcaje.
- Medir el callback dentro de tareas largas y Lighthouse en staging, sin
  atribuir una mejora de TBT a perfiles muestreados.

Fuera (explícito):

- Cambiar el endpoint, el servicio, las claves de query o la automatización de
  inicio de jornada.
- Modificar `TimeControl.view.tsx`, marcada `UI-PROTECTED`.
- Declarar mejora de TBT sin una mediana menor y rangos de Lighthouse que no se
  solapen.

## Criterios de aceptación

- [x] AC1: El estado inicial y el estado con empleado seleccionado no calculan
      resultados; una búsqueda activa entrega las mismas coincidencias
      insensibles a tildes y en orden alfabético.
- [x] AC2: Tests cubren el camino vacío, la búsqueda, la selección y el flujo de
      marcaje sin cambios funcionales.
- [x] AC3: En tres perfiles fríos de staging, el callback de filtrado/orden no
      aparece como frame repetido dentro de tareas largas; la API y las demás
      respuestas permanecen en HTTP 200.
- [x] AC4: Cinco corridas Lighthouse usan la misma configuración móvil y
      backend; se registran TBT/FCP/LCP/CLS. Se conserva el cambio si FCP/LCP no
      empeoran más de 5% y CLS máximo no sube más de 0,01. TBT solo se declara
      mejorado si la mediana baja y los rangos dejan de solaparse.

## Restricciones

La lista solo se consume cuando `searchTerm` tiene contenido y no hay empleado
seleccionado. Una búsqueda activa debe conservar sus resultados y orden. No se
realizan escrituras de negocio durante la medición. Rollback: restaurar el
cálculo original de `filteredEmployees`.

## Trazabilidad

- Tests: `frontend/src/tests/components/time_control/ClockingPanel.spec.tsx`.
- Baseline de perfil: `./evidencia/time-control-production-cpu-before-2026-10-25.json`.
- Evidencia final: `./evidencia/resultado.md`, perfil CDP y Lighthouse posteriores.
- Bitácora: `.jules/bolt.md`.
