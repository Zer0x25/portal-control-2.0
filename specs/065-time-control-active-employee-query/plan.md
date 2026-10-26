# Plan 065: Time Control Active Employee Query

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

Cómo se implementa en 3-6 pasos. Sin código, solo decisiones técnicas.

1. Extender el probe con un diagnóstico opt-in de lectura autenticada `status=Activo` que persiste solo bytes y una bandera de filtro.
2. Capturar tres contextos en staging y comparar bytes de lista completa frente a filtrada.
3. Si la reducción es inferior al 25%, descartar el cambio de comportamiento y registrar el dato para elegir el siguiente cuello de botella.

## Archivos a tocar

| Archivo                                                   | Cambio                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| `frontend/e2e/performance.spec.ts`                        | Añadir bytes de respuesta de empleados y diagnóstico activo opt-in. |
| `specs/065-time-control-active-employee-query/evidencia/` | Guardar baseline y decisión.                                        |
| `.jules/bolt.md`                                          | Documentar mediciones y el siguiente candidato.                     |

## Contratos afectados

No se modifica ningún contrato; `/api/employees` ya acepta el filtro de estado.

## Riesgos y rollback

El diagnóstico es opt-in para no añadir una solicitud sintética a la batería
normal. No se modifica el código de producto.

## Verificación

`PERFORMANCE_ACTIVE_EMPLOYEE_FILTER_PROBE=1` junto al probe Playwright dirigido;
`npm run spec:check`, `npm run docs:check` y `npm run preflight`.
