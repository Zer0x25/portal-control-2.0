# Spec 103: Compartir la consulta de configuración del shell en Control horario

- Estado: Implementado (2026-10-25; ganancia mediana TBT observada de 15%, sin atribución causal)
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

En el arranque de `/#/time-control`, `App` consulta
`is_control_interno_enabled` para construir rutas y `useTimeControlData` vuelve
a observar la misma query para entregar el valor a la vista y bloquear su
shell. Los perfiles vigentes muestran 23 commits del subárbol `app:application`
y 10 del subárbol de ruta durante el primer segundo. Se probará si eliminar el
observador duplicado reduce trabajo de arranque sin alterar el valor visible.

## Alcance

Dentro:

- Reutilizar en el contenedor de Control horario el valor y estado de carga de
  configuración que ya obtiene `App`.
- Mantener el valor predeterminado durante carga, las rutas protegidas y el
  momento en que la vista deja su estado de espera.
- Comparar el cambio con el build vigente de staging usando perfiles CPU,
  perfiles React de desarrollo y cinco corridas Lighthouse.

Fuera (explícito):

- Editar `TimeControl.view.tsx`, protegido por `UI-PROTECTED`.
- Cambiar la query global, su clave, cache, política de refetch o endpoint.
- Modificar la consulta del modal de acción rápida, que solo se monta al abrir.
- Cambiar los datos, reglas o acciones de Control horario.

## Criterios de aceptación

- [x] AC1: Con la misma respuesta y estado pendiente de la query de configuración,
      la ruta mantiene exactamente el mismo valor de `isControlInternoEnabled`
      e `isPageLoading`; el hook de datos no crea un segundo observador.
- [x] AC2: Pruebas focalizadas, TypeScript, lint, build y preflight pasan; no
      cambian API, base de datos, permisos, marcaciones ni `TimeControl.view.tsx`.
- [x] AC3: En tres perfiles CDP comparables y cinco corridas Lighthouse, ningún
      TBT, LCP o transferencia mediana empeora más de 5%, y al menos una métrica
      de CPU activo, React propio o TBT mejora al menos 5%. Si no se cumple,
      revertir el runtime y guardar el resultado como descartado.
- [x] AC4: Staging vuelve a `healthy` con el runtime aceptado o restaurado; no
      se escriben marcaciones ni datos de negocio.

## Resultado

Se elimina el segundo observador. El candidato cumple AC3 por TBT Lighthouse
mediano −15,0%, con LCP +0,02% y transferencia +0,03%. Dos pares de perfiles
CPU no concuerdan; los rangos TBT/LCP se solapan, por lo que no se afirma
causalidad. Ver [`evidencia/resultado.md`](./evidencia/resultado.md).

## Restricciones

Constitución I–V. Fastify sigue siendo el único servidor HTTP. No hay cambios
de OpenAPI, SDK, Prisma ni migraciones. Preservar la autorización de
`ProtectedRoute` y el shell de carga existente.

## Trazabilidad

- Tests: `frontend/src/tests/features/time-control/useTimeControlData.test.ts`.
- Evidencia: `./evidencia/resultado.md`, perfiles CPU/React y Lighthouse.
- Bitácora: `.jules/bolt.md`.
