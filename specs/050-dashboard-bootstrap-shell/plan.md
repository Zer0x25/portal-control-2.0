# Plan 050: Dashboard Bootstrap Shell

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

El Dashboard frío espera los módulos cliente antes de pintar contenido. La
prueba de concepto obtuvo LCP a 128 ms con un shell HTML fuera de `#root` y
CPU 4×; la variante dentro de `#root` fue reemplazada por React. La medición
con Lighthouse sigue siendo la puerta para conservar el cambio.

1. Escribir una prueba Playwright de staging que observe FCP/LCP y el ciclo de vida del shell para tres contextos móviles limpios.
2. Agregar a `index.html` una vista estática genérica del Dashboard, con hora local, sin datos de usuario y sin solicitudes adicionales.
3. Limitar su visibilidad a una sesión existente en `/#/dashboard`; permitir el script inline mediante su hash SHA-256 exacto en Nginx y validar esa relación antes y después del build.
4. Retirarla cuando aparezca el reloj real, al cambiar de ruta o al vencer el límite de seguridad.
5. Ejecutar primero la prueba dirigida, luego la batería completa y comparar tres muestras Lighthouse frías contra Spec 049. Si TBT varía entre corridas, repetir la batería y reportar ambas series y la mediana conjunta de seis muestras.
6. Conservar el cambio solo si cumple los presupuestos de mejora; registrar los reportes y el hash de imagen de staging.

## Archivos a tocar

| Archivo                                                                 | Cambio                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `frontend/index.html`                                                   | Shell liviano fuera del root de React, visibilidad de ruta y hora local. |
| `frontend/nginx.conf`                                                   | SHA-256 exacto del script inline en las políticas CSP existentes.        |
| `frontend/scripts/check-bootstrap-csp.cjs`                              | Falla si el hash HTML y las dos políticas Nginx dejan de coincidir.      |
| `frontend/package.json`                                                 | Ejecuta el check del hash antes y después del build.                     |
| `frontend/e2e/performance.spec.ts`                                      | Medición de FCP/LCP y ciclo de vida en tres contextos fríos.             |
| `specs/050-dashboard-bootstrap-shell/evidencia/resultado-2026-10-24.md` | Resultado, comparación, entorno y límites.                               |

## Contratos afectados

Sin cambios de API, SDK, rutas de producto ni base de datos.

## Riesgos y rollback

Un shell retenido puede tapar una ruta redirigida, alterar CLS o mostrar un
estado visual incorrecto. Se restringe por hash y sesión, se retira al primer
contenido real del Dashboard y tiene expiración. El check de build protege la
excepción CSP contra cambios accidentales. Rollback: quitar el shell y su
script de `frontend/index.html`, el hash CSP, el check y la prueba específica.

## Verificación

- `cd frontend && fnm exec --using 26.10.0 -- npx playwright test e2e/performance.spec.ts --project=perf --no-deps --grep "bootstrap"`
- `cd frontend && fnm exec --using 26.10.0 -- npm run perf:staging`
- `cd frontend && fnm exec --using 26.10.0 -- npm run validate:ci`
- `npm run spec:check && npm run docs:check && npm run lint:budget`
