# Plan 101: Evaluar el bail-out de React Compiler en el panel de marcación

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Confirmar imagen staging base y guardar tres perfiles React del código actual.
2. Añadir la prueba de intentos de marcación concurrentes antes de modificar el
   hook.
3. Retirar temporalmente la propiedad no consumida y la memoización manual cuyo
   motivo era el bail-out; mantener el guard `ref` del handler.
4. Verificar compiler, pruebas, TypeScript, lint y build; reconstruir solo
   frontend staging.
5. Comparar tres perfiles React y cinco Lighthouse con Spec 100. Revertir el
   runtime si no pasa el gate y guardar muestras agregadas.

## Archivos a tocar

| Archivo                                                             | Cambio                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------- |
| `frontend/src/features/time-control/hooks/useClockingPanel.ts`      | Candidato temporal para quitar lectura de ref durante render. |
| `frontend/src/features/time-control/components/ClockingPanel.tsx`   | Candidato temporal para delegar memoización al compilador.    |
| `frontend/src/tests/components/time_control/ClockingPanel.spec.tsx` | Guard de doble marcación concurrente.                         |
| `specs/101-time-control-clock-panel-compiler-bailout/evidencia/*`   | Capturas antes/después y resultado del gate.                  |
| `.jules/bolt.md`                                                    | Resultado descartado y siguiente foco medido.                 |

## Contratos afectados

Ninguno. No cambian endpoints, payloads ni datos persistidos.

## Riesgos y rollback

La optimización puede reducir mediciones del profiler de desarrollo y empeorar
el bundle o TBT de producción. El criterio de retención está fijado en AC3; el
rollback restaura ambos componentes al código de Spec 100 y mantiene la prueba
de doble acción.

## Verificación

```bash
cd frontend
fnm exec --using=26.10.0 -- npm exec -- vitest run --project=jsdom src/tests/components/time_control/ClockingPanel.spec.tsx
fnm exec --using=26.10.0 -- npm run check
fnm exec --using=26.10.0 -- npm run lint
fnm exec --using=26.10.0 -- npm run build
fnm exec --using=26.10.0 -- npm run perf:time-control:cold
cd ..
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- node .agents/skills/ci-preflight/scripts/preflight.cjs
```
