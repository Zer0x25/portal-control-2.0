# Plan 076: shell temprano para Worker Portal

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Conservar la línea base de Spec 075 y verificar el elemento LCP y sus fases
   en los tres informes Lighthouse fríos.
2. Añadir primero una regresión Playwright que mida el shell, el root React, el
   candidato LCP y el reloj real para tres contextos worker limpios.
3. Reutilizar el markup y CSS inline ya existentes; resolver presentación e ID
   del shell por ruta sin duplicar contenido o estilos.
4. Mantener el root oculto hasta que cargue CSS y retirar el shell cuando el
   reloj real aparezca; conservar el timeout y la limpieza al cambiar de ruta.
5. Reconstruir solo el frontend de staging, ejecutar la prueba y la batería,
   comparar los perfiles y guardar el run y resultado.
6. Actualizar el diario de rendimiento, completar tareas, ejecutar preflight y
   crear un commit local si se cumplen los criterios.

## Archivos a tocar

| Archivo                                                  | Cambio                                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `frontend/index.html`                                    | Elegir título/identidad del shell según la ruta autenticada y mantener su handoff actual.        |
| `frontend/nginx.conf`                                    | Actualizar el hash CSP exacto del script bootstrap expandido.                                    |
| `frontend/scripts/check-bootstrap-csp.cjs`               | Verificar el identificador genérico y hash exacto en source/dist.                                |
| `frontend/vite.config.ts`                                | Mantener el transform de minificación y handoff de CSS con los identificadores genéricos.        |
| `frontend/e2e/performance.spec.ts`                       | Medir shell previo a React y reloj real en tres sesiones worker; cubrir sesión ausente y retiro. |
| `specs/076-worker-portal-bootstrap-shell/`               | Registrar requisitos, implementación, evidencia y límites.                                       |
| `specs/039-frontend-performance-battery/evidencia/runs/` | Guardar corrida completa de staging.                                                             |
| `.jules/bolt.md`                                         | Anotar resultado, causalidad admitida y siguiente foco.                                          |

## Contratos afectados

Ninguno. No cambian rutas HTTP, OpenAPI/SDK, autenticación, base de datos ni
datos de negocio.

## Riesgos y rollback

- Un shell que no se limpia puede tapar errores; el timeout y pruebas de cambio
  de ruta deben revelar el root.
- Un shell que aparece en una ruta no elegible puede falsear LCP; la detección
  se limita a hash de Dashboard/Worker Portal y requiere sesión.
- La hora previa usa el reloj local y no se presenta como dato sincronizado; el
  shell debe retirarse al montar `ServerClock`.
- El HTML tiene presupuesto máximo de 5.120 bytes. Se reutiliza un único nodo
  para no duplicar markup ni CSS. Si se excede, se revierte la expansión.

Rollback: volver al shell exclusivo de Dashboard; conservar la evidencia del
experimento sin cambiar la vista protegida o los datos de staging.

## Verificación

```bash
cd frontend
fnm exec --using=26.10.0 -- npx playwright test --project=perf --no-deps e2e/performance.spec.ts -g "Worker Portal bootstrap"
fnm exec --using=26.10.0 -- npm run perf:staging
cd ..
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
git diff --check
```
