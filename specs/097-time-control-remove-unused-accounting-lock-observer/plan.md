# Plan 097: quitar observador contable sin consumidor

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir una expectativa de regresión en el test de `useTimeControl` para que
   falle mientras la llamada a la query siga presente.
2. Eliminar la importación y llamada sin consumidor; dejar las lecturas usadas
   en `useTimeControlModals` y `useTimeControlData`.
3. Ejecutar las pruebas de los tres hooks para proteger uso y valor de la fecha.
4. Reconstruir solo frontend de staging y repetir las tres visitas frías y el
   perfil de CPU de Control horario.
5. Registrar resultado/preflight y commitear solo si no hay regresiones.

## Archivos a tocar

| Archivo                                                           | Cambio                                              |
| ----------------------------------------------------------------- | --------------------------------------------------- |
| `frontend/src/features/time-control/hooks/useTimeControl.ts`      | Retirar la query sin consumidor.                    |
| `frontend/src/tests/features/time-control/useTimeControl.test.ts` | Fijar que el hook no cree el observador redundante. |
| `specs/097-time-control-remove-unused-accounting-lock-observer/`  | AC, tareas y evidencia.                             |
| `.jules/bolt.md`                                                  | Resultado y siguiente foco medido.                  |

## Contratos afectados

Ninguno. No se modifica API, `swagger.json`, SDK, Prisma ni migraciones.

## Riesgos y rollback

El observador descartado podría haber ocultado una dependencia accidental. Las
pruebas deben confirmar que los dos consumidores reales conservan el valor y
los bloqueos. Revertir la eliminación si cambia una acción protegida o el
`effectiveLockDate`.

## Verificación

```bash
fnm exec --using 26.10.0 -- npm --prefix frontend run test:run -- src/tests/features/time-control/useTimeControl.test.ts src/tests/features/time-control/useTimeControlModals.test.ts src/tests/features/time-control/useTimeControlData.test.ts
fnm exec --using 26.10.0 -- npm --prefix frontend run check
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api fnm exec --using 26.10.0 -- npm --prefix frontend run perf:profile:route -- --route=time-control --output=../specs/097-time-control-remove-unused-accounting-lock-observer/evidencia/time-control-production-cpu-after-2026-10-25.json
node .agents/skills/ci-preflight/scripts/preflight.cjs
```
