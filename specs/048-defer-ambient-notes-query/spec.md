# Spec 048: Defer Ambient Notes Query

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-23
- ADR relacionado: N/A

## Problema

El Dashboard pide `GET /api/notes` en cada inicio porque `AmbientReminderManager` consulta las notas al montarse. Los recordatorios se programan a intervalos aleatorios de 10 a 30 minutos, así que esta lectura ocurre mucho antes de que el componente la necesite. El modal Quick Notes ya se carga al abrirse, pero hoy su hook y el gestor ambiental comparten una query siempre habilitada.

## Alcance

Dentro:

- Deshabilitar la query de notas del gestor ambiental hasta un minuto antes de su próximo recordatorio.
- Mantener la carga inmediata al abrir Quick Notes.
- Esperar a que termine una carga pendiente antes de decidir si hay una nota que mostrar.
- Medir tres inicios de Dashboard y una apertura del modal en staging, guardando registros comparables.

Fuera (explícito):

- Cambiar rutas Fastify, contratos HTTP, datos de notas o frecuencia de recordatorios.
- Afirmar una mejora de LCP o del render visible basada solo en menos solicitudes.
- Diferir otras lecturas del Dashboard en esta iteración.

## Criterios de aceptación

- [x] AC1: Al iniciar Dashboard con un recordatorio a más de 60 segundos, no se envía `GET /api/notes`.
- [x] AC2: La query ambiental se habilita como máximo 60 segundos antes del recordatorio y el modal Quick Notes conserva la carga al abrirse.
- [x] AC3: Si la consulta sigue cargando cuando llega la hora, el gestor espera el resultado y no omite ni reprograma el recordatorio mientras espera.
- [x] AC4: Tres inicios en staging registran ocho endpoints únicos (nueve después de Spec 047), todos exitosos y sin duplicados; abrir Notas solicita `/api/notes` bajo demanda.
- [x] AC5: La comparación registra conteo de solicitudes y tiempos visibles antes/después, sin atribuir mejora de render si los rangos se solapan.

## Restricciones

Sin cambios de contrato ni esquema. Mantener React Query como propietario del estado remoto y respetar el comportamiento ya existente del modal. El rollback consiste en restaurar el hook compartido a siempre habilitado y el `AmbientReminderManager` a su comportamiento previo.

## Trazabilidad

- Tests que lo probarán: `frontend/src/tests/notifications/AmbientReminderManager.test.tsx`, `frontend/e2e/performance.spec.ts` y pruebas existentes de Quick Notes.
- Evidencia: `./evidencia/comparison.json` y `./evidencia/resultado-2026-10-23.md`.
- Docs a actualizar: `../../.jules/bolt.md`.
