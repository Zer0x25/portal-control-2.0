# Plan 095: evitar reaplicar el tema del bootstrap

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Las pruebas del slice fallaron con el código base al detectar el `<style>`
   redundante; se mantuvo una prueba para el camino de cambio real del tema.
2. `_applyTheme` compara la clase actual con el tema resuelto; si coinciden,
   actualiza el store solo cuando hace falta y sale sin tocar el DOM.
3. El camino de cambio conserva la supresión de transiciones, el recálculo de
   estilos y la limpieza existente.
4. La auditoría E2E con `app-theme=dark` observó cero inserciones del estilo y
   confirmó `.dark` activo al cargar Dashboard.
5. Se reconstruyó el frontend de staging, se corrieron tres perfiles CDP, se
   registraron los límites de la comparación y pasó el preflight completo.

## Archivos a tocar

| Archivo                                       | Cambio                                                |
| --------------------------------------------- | ----------------------------------------------------- |
| `frontend/src/store/slices/themeSlice.ts`     | Evitar DOM/reflow si el tema ya coincide.             |
| `frontend/src/tests/store/themeSlice.test.ts` | Cubrir la aplicación idempotente y el cambio de tema. |
| `frontend/e2e/performance.spec.ts`            | Verificar bootstrap y no reinserción del estilo.      |
| `specs/095-theme-bootstrap-idempotency/`      | Criterios, tareas y evidencia.                        |
| `.jules/bolt.md`                              | Resultado medido y siguiente foco.                    |

## Contratos afectados

Sin cambios. No se modifican endpoints, permisos ni datos.

## Riesgos y rollback

Si la clase del documento no refleja el tema elegido, la optimización podría
dejar la interfaz con colores incorrectos. La condición compara exactamente el
estado esperado; el E2E cubre el bootstrap oscuro y las pruebas cubren una
transición real. Si cualquier prueba falla o el arranque medido empeora, revertir
el guard de idempotencia.

## Verificación

```bash
fnm exec --using 26.10.0 -- npm --prefix frontend run test:run -- src/tests/store/themeSlice.test.ts
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api fnm exec --using 26.10.0 -- npm --prefix frontend exec -- playwright test e2e/performance.spec.ts --project=perf --no-deps --grep "theme bootstrap"
fnm exec --using 26.10.0 -- npm --prefix frontend run check
fnm exec --using 26.10.0 -- npm --prefix frontend run perf:profile:route -- --route=time-control --output=../specs/095-theme-bootstrap-idempotency/evidencia/time-control-production-cpu-after-2026-10-25.json
fnm exec --using 26.10.0 -- npm run preflight
```
