# Plan 057: Time Control Sync Overlay LCP

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Agregar primero la prueba roja que perfila tres arranques fríos y comprueba que el overlay siga cubriendo el shell mientras sincroniza.
2. Quitar solo la animación de entrada del overlay y los pulsos de sus elementos decorativos/textuales; conservar el spinner y el flujo de sincronización.
3. Ejecutar la prueba enfocada antes y después del cambio para verificar estilos calculados, ruta visible debajo y tiempos del candidato LCP.
4. Reconstruir únicamente el frontend de staging; correr la prueba enfocada y `npm run perf:staging` para obtener tres muestras Lighthouse comparables.
5. Aceptar el cambio solo si cumple AC3. La comparación no llegó al umbral de LCP: se restauraron las clases originales y se guardó el resultado del experimento sin declarar mejora.

## Archivos a tocar

| Archivo                                                           | Cambio                                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `frontend/src/components/ui/InitialSyncOverlay.tsx`               | Retirar fade/pulsos decorativos conservando pantalla bloqueante, spinner y progreso. |
| `frontend/e2e/performance.spec.ts`                                | Capturar estilos, hit-test y FCP/LCP en tres sesiones frías autenticadas.            |
| `specs/057-time-control-sync-overlay-lcp/*`                       | Registrar criterios, estrategia, tareas y resultado del experimento.                 |
| `specs/039-frontend-performance-battery/evidencia/runs/*`         | Guardar batería completa post-rebuild con el digest de imagen.                       |
| `specs/039-frontend-performance-battery/evidencia/runs/README.md` | Documentar el probe frío del overlay y enlazar el run.                               |
| `.jules/bolt.md`                                                  | Añadir el aprendizaje y el foco siguiente con evidencia, sin atribución excesiva.    |

## Contratos afectados

Ninguno. No cambian HTTP, OpenAPI, SDK, Prisma, base de datos ni almacenamiento local.

## Riesgos y rollback

Sin el fade, el overlay aparece de inmediato y la transición visual es más directa; el spinner y la barra siguen comunicando progreso. El hit-test debe confirmar que la pantalla continúa bloqueando la app hasta terminar la sincronización. Rollback: restaurar `animate-in fade-in [animation-duration:800ms]` y los `animate-pulse` retirados.

## Verificación

```bash
fnm exec --using=26.10.0 -- npm --prefix frontend run check
fnm exec --using=26.10.0 -- npm --prefix frontend run lint
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
fnm exec --using=26.10.0 -- npm run perf:staging
```

## Resolución

El cambio visual fue revertido tras fallar AC3. El probe Playwright se conserva como medición del LCP candidato, estilos calculados y bloqueo del overlay; el bundle de staging fue reconstruido con las clases originales.
