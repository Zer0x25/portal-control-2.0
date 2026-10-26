# Plan 053: Time Control Defer Edit Timestamp Modal

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Capturar solicitudes y bytes en la ruta fría, con una aserción Playwright que demuestre la descarga prematura del editor.
2. Cambiar la importación diferida a la ruta directa del módulo y montar el editor solo cuando `editingRecordInfo` exista.
3. Probar en Vitest que el modal no se monta cerrado y aparece cuando la vista recibe el registro de edición.
4. Reconstruir staging y ejecutar la batería de rendimiento; guardar comparación de ruta, tamaño transferido y medianas con la corrida anterior como base.
5. Ejecutar checks frontend y preflight, completar tareas y registrar resultados.

## Archivos a tocar

| Archivo                                                             | Cambio                                                            |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `frontend/src/features/time-control/views/TimeControl.view.tsx`     | Import directo y montaje condicional del modal de edición.        |
| `frontend/e2e/performance.spec.ts`                                  | Verificar que el chunk del editor no se solicita en la ruta fría. |
| `frontend/src/tests/features/time-control/TimeControlView.test.tsx` | Verificar la frontera de montaje cerrado/abierto del editor.      |
| `specs/053-time-control-defer-edit-timestamp-modal/`                | Criterios, plan, tareas y resultado.                              |
| `specs/039-frontend-performance-battery/evidencia/`                 | Conservar JSON y comparación de Control horario.                  |

## Contratos afectados

Sin cambios a rutas HTTP, esquemas Prisma, OpenAPI, SDK, migraciones ni API de componentes. El modal conserva sus props y comportamiento; solo cambia su momento de carga.

## Riesgos y rollback

- Riesgo: posponer el módulo puede demorar levemente la primera apertura del editor. La prueba de vista espera la interfaz tras recibir el registro.
- Riesgo: la medición Lighthouse varía entre corridas por CPU; guardar tres muestras y comparar también bytes/solicitudes.
- Rollback: revertir la condición de montaje y la importación del módulo; conservar evidencia para comparar.

## Verificación

- `E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api fnm exec --using 26.10.0 -- npm --prefix frontend run e2e -- --project=perf --no-deps e2e/performance.spec.ts --grep "Time Control excludes"`
- `fnm exec --using 26.10.0 -- npm --prefix frontend run test -- src/tests/features/time-control/TimeControlView.test.tsx`
- `fnm exec --using 26.10.0 -- npm run perf:staging`
- `fnm exec --using 26.10.0 -- npm --prefix frontend run check`
- `fnm exec --using 26.10.0 -- npm --prefix frontend run lint`
- `fnm exec --using 26.10.0 -- npm run preflight`
- `fnm exec --using 26.10.0 -- npm run spec:check`
