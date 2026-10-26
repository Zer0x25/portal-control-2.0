# Spec 049: Defer Role-specific Auto-start Code

- Estado: Completada y validada en staging
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

La batería Lighthouse de Spec 039 midió en el Dashboard frío 3,71 s de FCP, 5,33 s de LCP y 295.739 bytes de scripts. La traza mostró ~80 KB de React Core y `PersistentLayout` cargó módulos `useScheduling`, `useShiftManager`, asignaciones, feriados y licencias para un Administrador sin empleado, aunque esas funciones solo sirven para el auto-inicio asociado a Control de Reloj. `useLoginAutomations` importa estáticamente estos módulos y mantiene la query deshabilitada, pero el código sigue en la ruta crítica.

## Alcance

Dentro:

- Separar el efecto de auto-inicio en un componente de carga dinámica.
- Montar el componente solo cuando el usuario y su empleado vinculado pueden usar auto-inicio.
- Mantener el chequeo de entrega de turno, condiciones de horario y guardado de sesión.
- Medir los chunks iniciales y repetir la batería de rendimiento en staging.

Fuera (explícito):

- Cambiar roles, permisos, política de inicio de turno, servicios HTTP o contratos.
- Retrasar consultas o cambiar la frecuencia de las funciones de usuarios no elegibles.
- Cambiar el diseño del Dashboard o la presentación de la bienvenida.

## Criterios de aceptación

- [x] AC1: En Dashboard para Administrador sin empleado elegible, no se solicitan los chunks de auto-inicio (`useScheduling`, `useShiftManager` y dependencias exclusivas) ni consultas de planificación.
- [x] AC2: Para una cuenta elegible, el auto-inicio conserva la espera de datos completos, el horario laboral, el umbral de hora y la protección `AUTO_LOGIN_ACTIONS_DONE`.
- [x] AC3: El chequeo y modal de entrega de turno continúan funcionando para los roles aplicables.
- [x] AC4: La batería Lighthouse posterior captura tres muestras frías de Dashboard y 17 rutas estándar; la comparación registra bytes/scripts, FCP, LCP, TBT, solicitudes y ausencia de regresión visual/funcional.

## Restricciones

Sin cambios a contratos HTTP o comportamiento para usuarios elegibles. El criterio de montaje deriva de `shouldLoadAutoStartSchedule`. Rollback: volver a importar `useLoginAutomations` de forma estática y restaurar el efecto de programación en ese hook.

## Trazabilidad

- Tests que lo probarán: `frontend/src/tests/hooks/useLoginAutomations.test.tsx`, `frontend/src/tests/hooks/AutoStartShiftAutomation.test.tsx` y `frontend/e2e/performance.spec.ts`.
- Baseline: `../039-frontend-performance-battery/evidencia/runs/2026-10-24T01-42-28-474Z-b49d6915.json`.
- Evidencia posterior: `./evidencia/resultado-2026-10-24.md`.
- Docs a actualizar: `../../.jules/bolt.md`.

## Evidencia

- Resultado comparativo: [`evidencia/resultado-2026-10-24.md`](./evidencia/resultado-2026-10-24.md).
- Métricas estructuradas: [`evidencia/comparison.json`](./evidencia/comparison.json).
