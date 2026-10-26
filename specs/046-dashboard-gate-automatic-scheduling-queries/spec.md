# Spec 046: Dashboard Gate Automatic Scheduling Queries

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

El layout monta `useLoginAutomations` en todas las sesiones y ese hook usa `useScheduling`, que inicia 10 lecturas de programación/configuración aunque la sesión no pueda ejecutar auto-inicio. En staging, `admin` no tiene empleado asociado: abrir Dashboard produjo 20 endpoints API únicos y 10 lecturas exclusivas del cálculo de auto-inicio; 14 requests seguían en vuelo cuando apareció el reloj del servidor.

## Alcance

Dentro:

- Habilitar los datos usados para auto-inicio solo cuando rol, empleado y cargo cumplan la regla actual.
- Conservar la carga por defecto de `useScheduling` para sus consumidores de planificación y portal.
- Evitar marcar la automatización como completada mientras los datos de programación aún cargan.
- Registrar en E2E qué rutas API de programación se solicitan al abrir Dashboard y comparar staging antes/después.

Fuera (explícito):

- Cambiar permisos, rutas/API, reglas de inicio, datos del Dashboard o visibilidad del traspaso de turno.
- Reducir consultas requeridas por las vistas de planificación o Worker Portal.
- Afirmar mejora de FCP/LCP a partir de un conteo de requests.

## Criterios de aceptación

- [x] AC1: Dado un usuario Administrador sin empleado asociado, el Dashboard no solicita las 10 rutas de programación/configuración que solo requiere el auto-inicio; otras rutas del Dashboard siguen disponibles.
- [x] AC2: Dado un usuario elegible para auto-inicio, la consulta de programación se habilita solo después de confirmar rol/cargo, y la automatización espera a que sus datos estén listos antes de consumirlos o marcarse completada.
- [x] AC3: Los consumidores de `useScheduling` que no pasan opciones conservan sus consultas habilitadas y el comportamiento existente.
- [x] AC4: El registro E2E y evidencia staging comparan requests, tiempos de UI/API y estado HTTP antes/después, sin atribuir cambios de CWV al gating.

## Restricciones

- Sin cambios de permisos del servidor, contrato HTTP, persistencia o reglas de negocio.
- No deshabilitar consultas compartidas por otros consumidores de TanStack Query.
- Mantener la regla: `Reloj_Control` con empleado; `Administrador`/`Supervisor_Elevado` solo si su empleado tiene cargo `Reloj_Control`.
- Revertir el cambio restaura las consultas predeterminadas y el ciclo de auto-inicio anterior.

## Trazabilidad

- Baseline Playwright: `evidencia/dashboard-startup-before.json` (captura 2026-10-24, staging local, imagen `sha256:e82c07b90d7f53437a3df7f5da691a86c681e0ec878fbbc57c9cd917d1895921`).
- Tests: `frontend/e2e/performance.spec.ts`, `frontend/src/tests/utils/autoStartEligibility.test.ts`, `frontend/src/tests/hooks/useLoginAutomations.test.tsx` y `frontend/src/tests/hooks/useSchedulingQueryGating.test.tsx`.
- Resultado final: `evidencia/resultado-2026-10-24.md`.
