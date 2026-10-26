# Spec 073: exigir el endpoint vigente en la batería de staging

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

La corrida `2026-10-24T17-18-03-710Z-2421fc68` se detuvo en Playwright antes de
Lighthouse: el test buscó `GET /api/employees` y no encontró solicitudes. El
frontend ya carga opciones de marcación mediante `/api/employees/clocking-options`
(Spec 066), pero `perf:staging` no activa `PERFORMANCE_REQUIRE_CLOCKING_OPTIONS_ENDPOINT`; así,
la batería queda dependiendo de variables exportadas manualmente en la terminal.

## Alcance

Dentro:

- Hacer que `perf:staging` exija de forma predeterminada el endpoint vigente de
  opciones de marcación en sus pruebas de sincronización inicial.
- Cubrir la configuración efectiva del entorno con un test unitario.
- Repetir la batería completa contra el frontend reconstruido de staging y
  conservar el registro versionado.

Fuera (explícito):

- Cambiar endpoints, comportamiento de producto, datos de staging o umbrales de
  Lighthouse.
- Añadir probes adicionales o alterar los escenarios y rutas medidos.

## Criterios de aceptación

- [x] AC1: `perf:staging` siempre pasa `PERFORMANCE_REQUIRE_CLOCKING_OPTIONS_ENDPOINT=1`
      al proceso Playwright, sin depender del entorno interactivo del usuario.
- [x] AC2: Un test de regresión verifica que la batería fuerza el endpoint vigente,
      fija las URLs de staging y conserva otras variables heredadas.
- [x] AC3: Una corrida completa de staging valida las 18 rutas Playwright,
      Lighthouse estándar y perfiles fríos; el registro queda con estado `passed`,
      commit identificado y árbol limpio al inicio.
- [x] AC4: Preflight, `spec:check`, `docs:check`, formato y lint budget pasan.

## Restricciones

- Solo se mide el staging local aislado en `127.0.0.1:8080`; no se cambia la base
  de datos ni se envían mutaciones de negocio.
- El test de sincronización debe exigir el contrato actual `/api/employees/clocking-options`
  y comprobar respuesta válida con filas.
- El registro fallido anterior se conserva como evidencia diagnóstica y no se
  interpreta como regresión de producto.

## Trazabilidad

- Tests que lo probarán: `frontend/scripts/run-performance-battery.test.cjs` y
  batería `npm run perf:staging`.
- Código: `frontend/scripts/run-performance-battery.cjs` y
  `frontend/e2e/performance.spec.ts` (solo se modifica la configuración del runner).
- Antecedentes: Specs 039 y 066; corrida fallida guardada en
  `../039-frontend-performance-battery/evidencia/runs/2026-10-24T17-18-03-710Z-2421fc68.json`.
- Resultado: `./evidencia/resultado-2026-10-24.md` y corrida aprobada
  `../039-frontend-performance-battery/evidencia/runs/2026-10-24T17-23-56-778Z-9e6c151b.json`.
