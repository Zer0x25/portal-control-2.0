# Spec 102: Enriquecimiento de turnos por página en Control horario

- Estado: Descartado (2026-10-25; rollback completo por fallo del gate LCP)
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

En tres perfiles fríos de Control horario, la ruta abre cuatro solicitudes de
catálogos de turnos, asignaciones, feriados y permisos junto con la carga de
registros. Solo se usan para enriquecer las filas de la página actual. Ya existe
`POST /api/shifts/schedule/matrix`, que devuelve el mismo tipo de horario en una
respuesta, pero su selección actual excluye empleados inactivos y no puede
reemplazar los catálogos sin cambiar ese comportamiento histórico.

## Alcance

Dentro:

- Extender el contrato existente con una opción explícita que incluya empleados
  inactivos solo cuando el llamante entrega sus IDs.
- Hacer que Control horario consulte una matriz por cada página de registros,
  acotada a sus IDs únicos y al rango de fechas de esa página.
- Mantener el mismo dato final de horario para filas activas e inactivas y
  evitar una matriz global o consultas cuando una página no contiene filas.
- Comparar código, solicitudes, bytes transferidos, TBT y LCP en la imagen local
  de staging.

Fuera (explícito):

- Editar `TimeControl.view.tsx`, protegido por `UI-PROTECTED`.
- Cambiar reglas de planificación, paginación de registros, estados de jornada,
  persistencia, esquema de base de datos o permisos existentes.
- Cambiar el comportamiento predeterminado de la matriz que usa el calendario.
- Combinar endpoints no relacionados del shell.

## Criterios de aceptación

- [x] AC1: Dada una petición de matriz sin `includeInactive` (o `false`), el
      endpoint conserva la selección actual de empleados activos; con `true`,
      devuelve únicamente los IDs solicitados, incluidos empleados inactivos.
      `includeInactive: true` con una lista vacía se rechaza, y la restricción
      de empleados propios para roles self-only se mantiene.
- [x] AC2: Dadas las páginas de registros de Control horario, cada página no
      vacía produce una query con IDs únicos ordenados y fechas mínima/máxima de
      sus filas; las páginas vacías no generan requests. El resultado mantiene
      la estructura `EmployeeDailyScheduleInfo`, también para empleados
      inactivos y páginas adicionales.
- [x] AC3: Pruebas Fastify cubren el valor predeterminado, inclusión de empleado
      inactivo, lista vacía y autorización; pruebas frontend cubren límites por
      página, deduplicación de IDs, estado vacío y enriquecimiento de filas.
      Swagger y SDK quedan sincronizados.
- [x] AC4: En tres perfiles funcionales fríos comparables, Control horario
      sustituye las cuatro solicitudes de catálogos por una matriz en la primera
      página (12 a 9 solicitudes API en la misma semilla), sin errores HTTP ni
      pérdida de filas o datos de horario. Cinco corridas Lighthouse deben
      mantener TBT y LCP dentro de +5% de la mediana base y la transferencia de
      las cuatro respuestas de catálogos no debe superar los bytes de la matriz.
      Si algún gate falla, se revierte el runtime y se conserva el resultado
      como descartado.
- [x] AC5: `spec:check`, `docs:check`, TypeScript, lint, pruebas enfocadas,
      preflight completo, build y readiness de staging pasan; solo se modifica
      el backend/frontend necesario para esta matriz.

## Resultado

AC1–AC3 se verificaron en el candidato experimental. AC4 activó la regla de
rollback: LCP mediano subió 6,69%, por encima del límite de +5%; TBT mediano
bajó 3,71%, pero con rangos solapados. AC5 pasó con runtime restaurado y
staging reconstruido. No se conserva ningún cambio de runtime ni contrato de
esta propuesta. Ver [`evidencia/resultado.md`](./evidencia/resultado.md).

## Restricciones

Constitución I–V; Fastify sigue siendo el único servidor HTTP. El POST existente
conserva validación de cuerpo y permisos; no hay migración de Prisma. Las claves
de query siguen la tabla canónica y las invalidaciones del root
`calendarMatrix`. El rollback restaura el hook de enriquecimiento y retira el
campo opcional del contrato/API generado.

## Trazabilidad

- Tests que lo probarán: `backend/tests/fastify-integration/shifts.test.ts`,
  `useTimeControlScheduleEnrichment.test.ts` y pruebas de equivalencia del
  enriquecimiento.
- Docs a actualizar: evidencia de esta spec y `.jules/bolt.md`.
