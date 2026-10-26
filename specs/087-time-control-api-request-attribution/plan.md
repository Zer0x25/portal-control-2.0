# Plan 087: atribuir solicitudes API del arranque de Control horario

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Escribir primero tests sintéticos para convertir `Network.MonotonicTime`,
   mapear rutas mediante las plantillas OpenAPI y asociar el inicio del request
   con un `RunTask`; prohibir serializar valores no saneados.
2. Al perfilador CDP agregar listeners `Network.requestWillBeSent`,
   `Network.responseReceived`, `Network.loadingFinished` y `Network.loadingFailed`
   antes de navegar. Mantener request IDs solo en memoria para unir eventos.
3. Resolver la pila iniciadora con los source maps cotejados byte a byte. El
   build de staging usa `node:26-alpine`; si el build del host genera hashes
   distintos, construir mapas en esa base y entregar `dist/assets` con
   `--profiled-assets-dir`. Convertir la URL al template OpenAPI permitido
   inmediatamente; descartar origen, parámetros y cualquier ruta que no
   coincida. No leer headers ni cuerpos.
4. Resumir por captura y template el estado, tiempo a headers, tiempo completo,
   bytes y stack iniciador. Relacionar el timestamp de inicio con tareas largas
   y registrar la alineación del reloj; nunca sumar duración de red a CPU.
5. Ejecutar tres sesiones en la imagen actual, restaurar `dist`, inspeccionar
   privacidad y actualizar el resultado de Spec 087 y `.jules/bolt.md`.

## Archivos a tocar

| Archivo                                               | Cambio                                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `frontend/scripts/profile-worker-production.mjs`      | Recolectar y sanear eventos de requests API durante los perfiles CDP existentes.    |
| `frontend/scripts/profile-worker-production.test.mjs` | Probar rutas OpenAPI, temporalidad, redirección, requests incompletos y privacidad. |
| `specs/087-time-control-api-request-attribution/`     | Guardar spec, plan, tareas y resultado con tres resúmenes actuales.                 |
| `.jules/bolt.md`                                      | Registrar hallazgo de solicitudes y siguiente experimento.                          |

## Contratos afectados

Ninguno. `backend/docs/swagger.json` se lee para clasificar rutas; no se modifica
OpenAPI, SDK, servidor, Prisma, almacenamiento ni datos.

## Riesgos y rollback

- CDP Network y Trace pueden tener relojes o escalas distintos. Comparar los
  valores monotónicos dentro de la misma sesión y reportar alineación como no
  disponible si no se demuestra el solapamiento.
- Una ruta que no coincida con OpenAPI se agrupa como `unmatched-api-route`; no
  se conserva ningún segmento original como fallback.
- Los stacks iniciadores pueden faltar en requests iniciados fuera de JavaScript;
  el registro deja ese caso como `unavailable` sin inventar un caller.
- Revertir los cambios solo afecta el perfilador y su evidencia, no la app.

## Verificación

```bash
cd frontend
fnm exec --using=26.10.0 -- node --test scripts/profile-worker-production.test.mjs
fnm exec --using=26.10.0 -- node scripts/profile-worker-production.mjs --route=time-control --profiled-assets-dir=<staging-compatible-dist-assets> --output=../specs/087-time-control-api-request-attribution/evidencia/time-control-api-requests-2026-10-25.json
fnm exec --using=26.10.0 -- npm run check
cd ..
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
git diff --check
```
