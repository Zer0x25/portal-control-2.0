# Plan 086: correlacionar tareas largas de Control horario

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Extender el perfilador CDP existente para guardar eventos de tarea y llamadas
   JS en memoria durante las mismas tres sesiones de CPU profiling.
2. Mantener solo tareas `RunTask` del renderer principal de 50 ms o más; enlazar
   llamadas `FunctionCall`/`EvaluateScript` por intersección temporal y resolver
   sus posiciones con los source maps locales ya validados contra staging.
3. Sanear antes de serializar: descartar trazas crudas y URL completas, guardar
   solo duración, ruta/función/línea saneadas y conteos.
4. Añadir tests unitarios para filtro de hilo, límites, asociación, mapas ausentes
   y privacidad; ejecutar tres capturas actuales y documentar el límite causal.
5. Restaurar `dist` normal y comprobar que la imagen staging no cambió.

## Archivos a tocar

| Archivo                                                         | Cambio                                                    |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| `frontend/scripts/profile-worker-production.mjs`                | Capturar y resumir tareas CDP con símbolos saneados.      |
| `frontend/scripts/profile-worker-production.test.mjs`           | Verificar asociación, filtrado y privacidad.              |
| `specs/086-time-control-long-task-trace/evidencia/resultado.md` | Guardar comparación y tres resúmenes actuales.            |
| `.jules/bolt.md`                                                | Registrar resultado y siguiente foco basado en evidencia. |

## Contratos afectados

Ninguno. No cambian rutas HTTP, esquemas, Prisma, OpenAPI, SDK ni datos.

## Riesgos y rollback

- Los eventos CDP pueden diferir de los límites de tareas de Lighthouse; se
  reportan por separado y no se comparan numéricamente como si fueran TBT.
- Los source maps podrían no coincidir con staging; detener la captura si falla
  la igualdad de assets y restaurar el build normal en `finally`.
- Si el trace no contiene un candidato de aplicación repetido, conservar la
  captura como diagnóstico y no cambiar runtime.
- Revertir el perfilador y sus tests no afecta la aplicación desplegada.

## Verificación

```bash
cd frontend
fnm exec --using=26.10.0 -- node --test scripts/profile-worker-production.test.mjs
fnm exec --using=26.10.0 -- npm run perf:profile:route -- --route=time-control
fnm exec --using=26.10.0 -- npm run check
fnm exec --using=26.10.0 -- npm run build
cd ..
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
git diff --check
```
