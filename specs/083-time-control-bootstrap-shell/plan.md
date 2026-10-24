# Plan 083: Time Control Bootstrap Shell

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

Reutilizar el shell inline que ya adelanta contenido en rutas autenticadas y
validar que la vista real siga controlada por React.

1. Añadir `#/time-control` a la lista de rutas que pueden mostrar el shell,
   únicamente después de comprobar que existe `authToken`; conservar el título
   genérico para respetar el presupuesto HTML.
2. Marcar el overlay de sincronización con un selector estable. En Control
   Horario, mostrarlo sobre el shell y ceder el shell al aparecer; Dashboard y
   Portal del Trabajador conservan su orden visual y esperan el reloj real.
   Conservar timeout y limpieza por `hashchange`.
3. Ampliar la cobertura E2E para título, sesión ausente, rol redirigido,
   liberación del shell y CSS; no cambiar la vista protegida.
4. Reconstruir solo `frontend` de staging y repetir `npm run perf:staging` con
   la configuración y los tres registros previos sin alteraciones.
5. Comparar medianas de LCP/FCP/TBT/CLS, anotar límites y ejecutar el preflight local antes del commit.

## Archivos a tocar

| Archivo                                                                    | Cambio                                                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `frontend/index.html`                                                      | Habilitar shell autenticado para Control Horario con el título genérico actual.   |
| `frontend/src/components/ui/InitialSyncOverlay.tsx`                        | Exponer un id estable y elevar el overlay sobre el shell solo en Control horario. |
| `frontend/nginx.conf`                                                      | Permitir el hash SHA-256 exacto del script inline modificado.                     |
| `frontend/e2e/performance.spec.ts`                                         | Cubrir la ruta nueva, ausencia de sesión y limpieza al navegar/redirigir.         |
| `specs/083-time-control-bootstrap-shell/evidencia/resultado-2026-10-24.md` | Comparar baseline y mediciones posteriores.                                       |
| `specs/039-frontend-performance-battery/evidencia/runs/`                   | Conservar ambos registros completos.                                              |

## Contratos afectados

Sin rutas HTTP, esquemas Prisma, `swagger.json`, SDK ni migraciones.

## Riesgos y rollback

El título temporal puede aparecer brevemente antes de que un rol restringido
sea redirigido; es genérico y no da acceso a contenido. En Control Horario, el
overlay aparece sobre el shell y lo retira; las otras rutas conservan el shell
sobre el overlay hasta que aparece el reloj real. El shell no retira ni modifica
la protección de React. La regresión se revierte removiendo `#/time-control`
de la lista del bootstrap, el selector del overlay y su z-index condicional.

## Verificación

Comandos: `cd frontend && npm run test:e2e -- e2e/performance.spec.ts -g "Bootstrap shell"`;
`cd frontend && npm run check:bootstrap-csp`; `npm run perf:staging` después de
reconstruir solo frontend; `npm run spec:check`; `npm run docs:check`;
`npm run lint:budget`; preflight frontend/root.
