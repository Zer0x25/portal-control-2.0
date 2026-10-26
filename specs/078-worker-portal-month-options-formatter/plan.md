# Plan 078: reutilizar el formateador de meses de Worker Portal

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir primero una aserción al test del hook para fijar valores, orden y
   etiquetas de 12 meses incluyendo el cambio de año.
2. Cambiar el callback medido para crear un `Intl.DateTimeFormat` local una vez
   y reutilizarlo para las 12 fechas.
3. Ejecutar el test dirigido, typecheck y lint frontend.
4. Reconstruir solo `frontend` en staging; esperar `healthy` y verificar gateway,
   API, worker, reloj y respuesta del selector sin realizar mutaciones.
5. Capturar tres perfiles con el runner de Spec 077, verificar identidad de
   todos los bundles y comparar el tiempo propio del callsite con el baseline.
6. Conservar el cambio solo si el tiempo propio baja al menos 20%; si falla,
   restaurar el código y la imagen de staging al commit 6936a2f.
7. Documentar el resultado y correr los gates antes del commit local.

## Archivos a tocar

| Archivo                                                                  | Cambio                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `frontend/src/features/worker-portal/hooks/useWorkerPortalData.ts`       | Una instancia local de `Intl.DateTimeFormat` por generación de opciones. |
| `frontend/src/tests/features/worker-portal/useWorkerPortalData.test.tsx` | Aserción de paridad de los 12 meses y el cambio de año.                  |
| `frontend/e2e/a11y.spec.ts`                                              | Comprobar las 12 opciones tras el rebuild de staging.                    |
| `specs/078-worker-portal-month-options-formatter/`                       | Criterios, plan, tareas y evidencia A/B.                                 |
| `.jules/bolt.md`                                                         | Registrar medición, decisión de conservar/revertir y el límite.          |

## Contratos afectados

Ninguno. No cambian rutas HTTP, OpenAPI/SDK, persistencia ni autenticación.

## Riesgos y rollback

- Las reglas de ICU podrían variar por navegador; la prueba compara el resultado
  candidato con el formato anterior en el mismo runtime y zona local.
- Si el profile runner no encuentra una reducción de 20%, restaurar únicamente
  los archivos de runtime y reconstruir el frontend con el código del commit
  `6936a2f`; conservar la evidencia del intento.
- La reconstrucción usa `up --build -d frontend`, sin recrear backend, DB ni
  volúmenes.

## Verificación

```bash
cd frontend
fnm exec --using=26.10.0 -- npx vitest run src/tests/features/worker-portal/useWorkerPortalData.test.tsx
fnm exec --using=26.10.0 -- npm run check
fnm exec --using=26.10.0 -- npm run lint
cd ..
docker compose --env-file .env.staging -f compose.staging.yaml up --build -d frontend
fnm exec --using=26.10.0 -- npm run perf:profile:worker
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- node .agents/skills/ci-preflight/scripts/preflight.cjs
git diff --check
```
