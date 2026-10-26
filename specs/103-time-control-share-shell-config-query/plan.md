# Plan 103: Compartir la consulta de configuración del shell en Control horario

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Capturar la línea base comparable y probar que el hook de Control horario
   no necesita crear otra suscripción a la query de configuración.
2. Pasar desde `App` al contenedor el booleano y `isLoading` de la consulta que
   ya controla las rutas. Mantener el valor por defecto y los permisos.
3. Verificar con pruebas, tipos, lint y build, y medir tres perfiles CPU y cinco
   corridas Lighthouse en staging con la misma base de datos.
4. Retener el cambio solo si se cumplen los gates de AC3; si falla, restaurar
   el runtime y conservar evidencia diagnóstica.

## Archivos a tocar

| Archivo                                                                   | Cambio                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| `frontend/src/App.tsx`                                                    | Pasar estado y valor ya observados al contenedor.       |
| `frontend/src/features/time-control/containers/TimeControl.container.tsx` | Recibir la configuración del shell.                     |
| `frontend/src/features/time-control/hooks/useTimeControlData.ts`          | Eliminar el segundo observador de la query.             |
| `frontend/src/tests/features/time-control/useTimeControlData.test.ts`     | Cubrir paridad y ausencia de la suscripción redundante. |
| `specs/103-time-control-share-shell-config-query/evidencia/`              | Guardar perfiles y decisión.                            |
| `.jules/bolt.md`                                                          | Registrar resultado y siguiente foco medido.            |

## Contratos afectados

Ninguno. No se cambian endpoints, esquemas, Swagger, SDK ni almacenamiento.

## Riesgos y rollback

Si `App` entrega un valor distinto durante la carga inicial, la vista podría
dejar su espera antes de tiempo. Mantener la misma query, defaults y estado
`isLoading`; cubrir ambos estados en pruebas. El rollback restaura el hook de
configuración original y quita las props del contenedor y de la ruta.

## Verificación

```bash
fnm exec --using 26.10.0 -- npm --prefix frontend exec -- vitest run --project jsdom src/tests/features/time-control/useTimeControlData.test.ts
fnm exec --using 26.10.0 -- npm --prefix frontend run check
fnm exec --using 26.10.0 -- npm --prefix frontend run lint
fnm exec --using 26.10.0 -- npm --prefix frontend run build
fnm exec --using 26.10.0 -- npm run preflight
fnm exec --using 26.10.0 -- npm --prefix frontend run perf:time-control:cold
fnm exec --using 26.10.0 -- npm --prefix frontend run perf:profile:route -- --route=time-control --output=../specs/103-time-control-share-shell-config-query/evidencia/time-control-production-cpu-after.json
```

## Resultado de ejecución

El A/B recapturado con el mismo backend da TBT mediano 216,5→184 ms (−15,0%),
LCP +0,02% y transferencia +0,03%. Los dos pares de CPU discrepan: el primero
favorece al candidato y la repetición alternada no. Se conserva por el gate de
TBT, como cambio con mejora observada, sin afirmar causalidad ni una reducción
estable de CPU. Ver [`evidencia/resultado.md`](./evidencia/resultado.md).
