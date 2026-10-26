# Plan 073: exigir el endpoint vigente en la batería de staging

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir primero una prueba que verifique la configuración del entorno de
   rendimiento y que falle si falta la expectativa del endpoint vigente.
2. Extraer la construcción del entorno del runner a una función pura y fijar
   `PERFORMANCE_REQUIRE_CLOCKING_OPTIONS_ENDPOINT=1` junto a las URLs locales.
3. Ejecutar las pruebas del harness y la batería completa contra staging.
4. Conservar tanto el registro diagnóstico fallido como la corrida completa
   validada y documentar la comparación obtenida.
5. Ejecutar preflight y las comprobaciones de formato antes del commit.

## Archivos a tocar

| Archivo                                                  | Cambio                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `frontend/scripts/run-performance-battery.cjs`           | Forzar la expectativa del endpoint actual y exponer configuración pura. |
| `frontend/scripts/run-performance-battery.test.cjs`      | Probar la configuración efectiva del runner.                            |
| `specs/073-staging-battery-current-endpoint/`            | Registrar alcance, tareas y evidencia de la corrida completa.           |
| `specs/039-frontend-performance-battery/evidencia/runs/` | Guardar corridas versionadas, incluida la falla de configuración.       |

## Contratos afectados

Sin cambios HTTP, OpenAPI, SDK, Prisma o migraciones. Solo se fija una variable
de configuración interna del harness Playwright para reflejar el endpoint que
ya implementan el backend y el frontend.

## Riesgos y rollback

Si el endpoint no está disponible en el staging aislado, la batería fallará con
un error explícito del test de readiness. El rollback consiste en revertir el
cambio del runner y su prueba; no modifica imágenes remotas ni datos de negocio.

## Verificación

- `node --test frontend/scripts/run-performance-battery.test.cjs`
- `npm run perf:staging` con Node 26 y staging local sano.
- `npm run preflight`, `npm run docs:check`, formato y `git diff --check`.
