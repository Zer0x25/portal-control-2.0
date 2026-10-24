# Plan 048: Defer Ambient Notes Query

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir una opción `enabled` al hook de notas, con `true` como valor predeterminado para conservar todos los consumidores existentes.
2. En `AmbientReminderManager`, calcular el comienzo de la ventana de precarga (60 segundos antes del disparador) y habilitar la query desde ese momento.
3. Si el disparador llega mientras la query está cargando, mantener el disparador activo y volver a evaluarlo cuando termine la consulta.
4. Escribir primero pruebas unitarias para el diferimiento, la ventana de precarga y el fetch pendiente; ampliar Playwright para comprobar el inicio y la apertura bajo demanda del modal.
5. Recompilar staging, capturar tres inicios y guardar comparación/evidencia junto al historial de optimización.

## Archivos a tocar

| Archivo                                                            | Cambio                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `frontend/src/hooks/queries/useNotesQuery.ts`                      | Aceptar habilitación condicional conservando el comportamiento predeterminado.             |
| `frontend/src/hooks/useQuickNotes.ts`                              | Exponer la opción de habilitación al consumidor.                                           |
| `frontend/src/notifications/components/AmbientReminderManager.tsx` | Activar la consulta 60 segundos antes y esperar si sigue en carga al llegar el disparador. |
| `frontend/src/tests/notifications/AmbientReminderManager.test.tsx` | Cubrir el inicio diferido, la precarga y la carga pendiente.                               |
| `frontend/e2e/performance.spec.ts`                                 | Comprobar que el arranque no pide notas y que abrir el modal sí lo hace.                   |
| `specs/048-defer-ambient-notes-query/evidencia/`                   | Guardar las capturas de staging y su comparación.                                          |
| `.jules/bolt.md`                                                   | Registrar el cambio medido y sus límites.                                                  |

## Contratos afectados

Sin cambios a rutas, esquemas, `swagger.json`, SDK ni migraciones. La API de datos sigue siendo `GET /api/notes`.

## Riesgos y rollback

La precarga demasiado tardía podría retrasar un recordatorio si la API responde lento; se configura 60 segundos de margen y no se descarta el disparador durante una carga activa. Si hay una regresión, restaurar el valor habilitado por defecto del consumidor ambiental y quitar el temporizador de precarga; los demás consumidores siguen usando el valor predeterminado.

## Verificación

- `fnm exec --using 26.10.0 -- npm run test:run -- src/tests/notifications/AmbientReminderManager.test.tsx` (desde `frontend/`).
- `fnm exec --using 26.10.0 -- npm run e2e -- e2e/performance.spec.ts` (desde `frontend/`, contra staging).
- Tres muestras seriadas de `Dashboard startup avoids the kiosk list and repeated API reads` y una muestra de apertura de Quick Notes en staging.
- `fnm exec --using 26.10.0 -- npm run validate:ci` (desde `frontend/`).
- `fnm exec --using 26.10.0 -- npm run preflight` (desde la raíz).
