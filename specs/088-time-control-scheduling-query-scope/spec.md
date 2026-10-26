# Spec 088: limitar consultas de useScheduling en Control horario

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

La captura fría de Spec 087 observa 19 solicitudes API por carga y 0 fallos.
`useTimeControl` solo consume `getEmployeeDailyScheduleInfo` de `useScheduling`,
pero el hook también habilita consultas de cuatro configuraciones, empleados de
marcación y solicitudes de corrección. Esas fuentes no participan en ese cálculo.

## Alcance

Dentro:

- Añadir un modo explícito de consulta mínima a `useScheduling` sin alterar su
  modo completo por defecto ni los demás consumidores.
- Activar el modo mínimo solo desde Control horario. Mantener consultas de
  patrones, asignaciones, feriados y permisos, que alimentan el cálculo de
  jornada diaria.
- Deshabilitar en ese modo consultas de configuración, empleados y correcciones,
  que no usa el único consumidor de `useScheduling` en esa ruta.
- Medir de nuevo solicitudes, tareas largas y Lighthouse en las mismas
  condiciones locales de staging.

Fuera (explícito):

- Cambiar servicios, endpoints, OpenAPI/SDK, datos o cuentas de staging.
- Cambiar lógica de jornadas, datos mostrados o permisos.
- Cambiar el modo por defecto de `useScheduling` en otras rutas.

## Criterios de aceptación

- [x] AC1: El modo completo sigue habilitando las mismas consultas y el modo
      `enabled: false` sigue deshabilitándolas, según las pruebas existentes.
- [x] AC2: En modo de enriquecimiento de horarios se mantienen habilitadas solo
      las consultas de patrones, asignaciones, feriados y permisos; se deshabilitan
      configuración, empleados y correcciones.
- [x] AC3: Control horario usa ese modo y `getEmployeeDailyScheduleInfo` conserva
      su resultado con los datos de programación disponibles, sin requerir un
      directorio de empleados.
- [x] AC4: Tres capturas frías de staging bajan las solicitudes observadas desde
      las 19 de base hasta 14 por navegación, sin fallos y con los endpoints de
      programación requeridos aún presentes. La solicitud de opciones de
      marcación sigue existiendo por consumidores del shell y del panel.
- [x] AC5: Se registra el cambio de TBT con el mismo perfil Lighthouse; no se
      declara mejora de TBT si la mediana no baja. La mediana observada baja.
- [x] AC6: Las otras rutas que llaman `useScheduling` conservan modo completo;
      no cambian contratos HTTP, SDK, Prisma ni staging backend.

## Restricciones

Constitución III y V: mantener Fastify como único servidor HTTP y seguir SDD.
Las reglas de Hooks de React no permiten omitir llamadas condicionalmente; se
mantienen los hooks y se limita su opción `enabled`. No se modifica el esquema
de API. El rollback consiste en quitar el modo mínimo del callsite de Control
horario.

## Trazabilidad

- Tests: `frontend/src/tests/hooks/useSchedulingQueryGating.test.tsx` y
  `frontend/src/tests/features/time-control/useTimeControl.test.ts`.
- Rendimiento: `specs/087-time-control-api-request-attribution/evidencia/time-control-api-requests-2026-10-25.json`.
- Evidencia antes/después y docs: carpeta `evidencia/` de esta Spec y `.jules/bolt.md`.
- Resultado: `./evidencia/resultado.md`.
