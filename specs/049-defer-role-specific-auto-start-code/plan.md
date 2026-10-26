# Plan 049: Defer Role-specific Auto-start Code

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Mantener en `useLoginAutomations` los datos y efectos de entrega de turno; devolver además la elegibilidad exacta para auto-inicio.
2. Mover `useScheduling` y `useShiftManager` al componente `AutoStartShiftAutomation`, que contiene solo la lógica de inicio automático y no renderiza UI.
3. Cargar dinámicamente ese componente en `PersistentLayout.container` solo cuando `shouldLoadAutoStartSchedule` acepta el rol, empleado y cargo. Mantener su fallback visual vacío.
4. Actualizar pruebas unitarias para cubrir elegibilidad, carga completa de la planificación, chequeo horario e idempotencia; ampliar Playwright para verificar la ausencia de chunks en Dashboard Admin.
5. Pasar validaciones, reconstruir staging, comprometer el código y correr la batería completa de rendimiento sobre ese commit limpio. Guardar su ledger, comparar con Spec 039 y documentar resultados.

## Archivos a tocar

| Archivo                                                         | Cambio                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `frontend/src/hooks/useLoginAutomations.ts`                     | Quitar imports/efecto de auto-inicio y exponer elegibilidad.          |
| `frontend/src/components/layout/AutoStartShiftAutomation.tsx`   | Nuevo componente diferido que contiene la lógica de turno automático. |
| `frontend/src/hooks/layout/usePersistentLayoutController.ts`    | Exponer el resultado de elegibilidad al layout.                       |
| `frontend/src/components/layout/PersistentLayout.container.tsx` | Lazy-load del componente solo para usuarios elegibles.                |
| `frontend/src/tests/hooks/useLoginAutomations.test.tsx`         | Cubrir elegibilidad sin cargar código de planificación.               |
| `frontend/src/tests/hooks/AutoStartShiftAutomation.test.tsx`    | Verificar espera, ejecución y guard de sesión.                        |
| `frontend/e2e/performance.spec.ts`                              | Afirmar que el Dashboard Admin no descarga chunks de auto-inicio.     |
| `specs/049-defer-role-specific-auto-start-code/evidencia/`      | Registrar comparación del build y batería Lighthouse.                 |
| `.jules/bolt.md`                                                | Añadir aprendizaje y evidencia de esta ruta de bundle.                |

## Contratos afectados

Ninguno. No se agregan endpoints ni cambian roles, esquemas, OpenAPI, SDK o migraciones.

## Riesgos y rollback

El usuario elegible descargará el chunk al confirmarse su empleado, antes de iniciar las consultas de planificación. Mantener la condición y estado de sesión existentes para no iniciar turnos no elegibles ni duplicados. Si el auto-inicio se retrasa o deja de ejecutarse, restaurar el efecto estático de `useLoginAutomations` y revertir el lazy-load.

## Verificación

- `fnm exec --using 26.10.0 -- npm run test:run -- src/tests/hooks/useLoginAutomations.test.tsx src/tests/hooks/AutoStartShiftAutomation.test.tsx` (desde `frontend/`).
- `fnm exec --using 26.10.0 -- npm run e2e:staging -- --project=perf --no-deps e2e/performance.spec.ts --grep 'Dashboard defers route'` (desde `frontend/`).
- `fnm exec --using 26.10.0 -- npm run validate:ci` (desde `frontend/`).
- `fnm exec --using 26.10.0 -- npm run preflight` (desde la raíz).
- `docker compose --env-file .env.staging -f compose.staging.yaml up --build -d frontend` y `npm run perf:staging` después del commit limpio.
