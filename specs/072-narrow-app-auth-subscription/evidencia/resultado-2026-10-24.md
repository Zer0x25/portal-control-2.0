# Resultado Spec 072: selector auth estrecho en App

## Procedimiento

- Baseline: Spec 070, tres contextos fríos de Control Horario, 412×823,
  Chromium 153, CPU 4×.
- Cambio: `App` usa un selector superficial de `isForcePasswordChangeModalOpen`,
  `clearMustChangePassword` y `logout`; el contrato general de `useAuth` se
  mantiene intacto.
- Comparación: mismos parámetros, perfiles nuevos con scopes de readiness,
  shell, ruta y vista. No se añadieron requests ni query markers.

## Comparación

Milisegundos/commits, mínimo / mediana / máximo con `n=3`:

| Métrica                                         |        Baseline Spec 070 |        Selector estrecho |            Cambio mediano |
| ----------------------------------------------- | -----------------------: | -----------------------: | ------------------------: |
| Commits de `app:application` en 1 s             |             26 / 29 / 32 |             21 / 21 / 22 |         29 → 21 (−27,6 %) |
| Commits de `app:application` durante validación |                3 / 3 / 3 |                3 / 3 / 3 |                sin cambio |
| `actualDuration` total de `app:application`     | 403,8 / 529,0 / 535,1 ms | 395,9 / 471,3 / 489,8 ms | −10,9 %, rangos solapados |
| `actualDuration` durante validación             |      5,8 / 9,7 / 16,9 ms |      6,9 / 8,5 / 10,0 ms | −12,4 %, rangos solapados |
| Commits de App durante lectura JSON             |                1 / 1 / 2 |                1 / 1 / 1 |        mediana sin cambio |

La mediana de commits de `App` bajó ocho, 27,6%, y pasa el gate estructural
predefinido de 20%. Se conserva el selector acotado. En la ventana de
validación, App siguió teniendo tres commits por muestra; el tiempo `actualDuration`
total y el solapamiento tienen rangos solapados.

## Decisión y límites

El cambio reduce renders del shell cuando cambian campos auth que App no usa,
pero las muestras no muestran menos commits en `validateInstanceId` ni durante
la lectura JSON. Los timings son de Vite dev, no equivalen al tiempo de CPU de
producción y no prueban mejora de LCP, FCP, TBT ni CWV. El resultado atribuido
al código es la menor mediana de commits de App en este perfil; la batería
Lighthouse de staging no se repitió en esta spec.

Durante las corridas Vite registró `Socket.IO connect_error` y cierres de proxy
`EPIPE`; el runner no mide ese canal, lo cual añade ruido al entorno dev.

## Privacidad y verificación

- El perfil contiene ruta fija, scopes, fases, marcas y duraciones; no guarda
  usuarios, tokens, query strings ni respuestas.
- Cada muestra retuvo 161–170 eventos del Profiler y cero descartados.
- Los tests del selector y los flujos de contraseña forzada pasan 3/3; TypeScript
  frontend pasa.
- Build de producción frontend aprobado.
- Preflight aprobado 6/6: secretos, spec, docs, Prettier Markdown, lint budget
  0/0 y TypeScript backend/frontend.
- Evidencia cruda:
  [`app-auth-render-profile-2026-10-24.json`](./app-auth-render-profile-2026-10-24.json).
