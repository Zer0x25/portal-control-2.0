# Plan 100: Diferir apertura de IndexedDB hasta el primer uso

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Guardar el resultado base de Spec 099 y comprobar que la imagen activa de
   staging coincide con su digest.
2. Añadir una prueba de módulo que demuestre que la importación no abre la base,
   la primera operación llama una vez a `openDB` y llamadas repetidas comparten
   la promesa.
3. Retirar solo la llamada de nivel superior a `initDB`; conservar la apertura
   memoizada que ya ejecutan todas las operaciones CRUD.
4. Ejecutar pruebas existentes de sincronización, caché de registros y fallback
   offline; reconstruir staging y repetir perfiles fríos y cinco Lighthouse.
5. Conservar el runtime solo si pasa AC3. De lo contrario, revertir ese archivo
   y dejar la spec/evidencia como descartada.

## Archivos a tocar

| Archivo                                                             | Cambio                                             |
| ------------------------------------------------------------------- | -------------------------------------------------- |
| `frontend/src/utils/indexedDB.ts`                                   | Quitar el efecto lateral de apertura al importar.  |
| `frontend/src/utils/indexedDB.lifecycle.test.ts`                    | Probar apertura bajo demanda y promesa compartida. |
| `frontend/src/tests/state/syncSlice.test.ts`                        | Confirmar la decisión del sync frío existente.     |
| `frontend/src/tests/hooks/useTimeRecordsQuery.test.tsx`             | Mantener lectura de registros y fallback de caché. |
| `specs/100-defer-timecontrol-indexeddb-open/evidencia/resultado.md` | Medición y decisión con imagen identificada.       |
| `.jules/bolt.md`                                                    | Registrar el resultado y el siguiente foco.        |

## Contratos afectados

Ninguno. No cambian rutas HTTP, esquemas, Prisma, OpenAPI, SDK ni versión o
contenido de IndexedDB.

## Riesgos y rollback

- Las muestras de Lighthouse son variables; las cinco corridas y el umbral AC3
  evitan aceptar una mejora por una sola muestra.
- La apertura puede ocurrir durante la primera lectura de caché y afectar el
  fallback offline; las pruebas cubren el comportamiento antes de medir.
- Si falla la igualdad de la imagen con los assets perfilados, detener el perfil.
- El rollback restaura la llamada inmediata y deja el esquema intacto.

## Verificación

```bash
fnm exec --using=26.10.0 -- npm run spec:check
cd frontend
fnm exec --using=26.10.0 -- npm exec -- vitest run --project=jsdom src/utils/indexedDB.lifecycle.test.ts src/tests/state/syncSlice.test.ts src/tests/hooks/useTimeRecordsQuery.test.tsx
fnm exec --using=26.10.0 -- npm run check
fnm exec --using=26.10.0 -- npm run lint
fnm exec --using=26.10.0 -- npm run format:check
fnm exec --using=26.10.0 -- npm run build
cd ..
docker compose --env-file .env.staging -f compose.staging.yaml up --build -d frontend
fnm exec --using=26.10.0 -- npm run preflight
```
