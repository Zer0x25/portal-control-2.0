# Plan 075: carga diferida del modal de corrección de Worker Portal

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir una regresión E2E de solo lectura que capture scripts en la primera
   carga de Worker Portal y falle si solicita el modal o `validation`.
2. Añadir un wrapper local `React.lazy` + `Suspense` y conservar el tipo de props
   mediante una importación solo de tipo al contenedor actual.
3. Probar que al montar el export diferido se carga y muestra el formulario real
   con datos sintéticos, sin llamar a submit.
4. Reconstruir únicamente el frontend de staging y ejecutar la batería completa;
   comparar las tres muestras frías con las mismas muestras de Spec 073.
5. Guardar el registro/evidencia, actualizar `.jules/bolt.md`, ejecutar preflight
   y crear un commit local si se cumplen los criterios.

## Archivos a tocar

| Archivo                                                                          | Cambio                                                         |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `frontend/src/features/worker-portal/index.ts`                                   | Exportar el wrapper en lugar del contenedor estático.          |
| `frontend/src/features/worker-portal/components/CorrectionRequestModal.lazy.tsx` | Crear frontera local de carga diferida.                        |
| `frontend/src/tests/features/worker-portal/CorrectionRequestModal.lazy.test.tsx` | Verificar la carga y el formulario visible sin mutación.       |
| `frontend/e2e/performance.spec.ts`                                               | Afirmar que la ruta fría no descarga el modal ni `validation`. |
| `specs/075-lazy-worker-portal-correction-modal/`                                 | Guardar requisitos, plan, tareas y resultado.                  |
| `specs/039-frontend-performance-battery/evidencia/runs/`                         | Conservar la corrida completa posterior al cambio.             |
| `.jules/bolt.md`                                                                 | Registrar el experimento y sus mediciones.                     |

## Contratos afectados

Ninguno. Se conserva el nombre del export, sus props y el comportamiento de
corrección. No se envía ninguna petición de mutación.

## Riesgos y rollback

La descarga diferida agrega una espera de red la primera vez que se abre el
modal. La prueba de componente confirma que el formulario real aparece al
montarlo; la ruta fría y Lighthouse comprueban el ahorro y el impacto. Si la
reducción es menor a 20.000 B o la mediana LCP empeora más de 5%, revertir el
wrapper y conservar la evidencia como experimento fallido.

Rollback: restaurar el export estático del contenedor en `index.ts` y quitar el
wrapper y sus pruebas; no hay datos ni estado de staging que restaurar.

## Verificación

```bash
cd frontend
fnm exec --using=26.10.0 -- npm run test:run -- src/tests/features/worker-portal/CorrectionRequestModal.lazy.test.tsx
fnm exec --using=26.10.0 -- npx playwright test --project=perf --no-deps e2e/performance.spec.ts -g "Worker Portal defers correction"
```

Después de reconstruir el frontend local:

```bash
cd ..
docker compose --env-file .env.staging -f compose.staging.yaml up --build -d frontend
cd frontend
fnm exec --using=26.10.0 -- npm run perf:staging
cd ..
fnm exec --using=26.10.0 -- npm run preflight
git diff --check
```
