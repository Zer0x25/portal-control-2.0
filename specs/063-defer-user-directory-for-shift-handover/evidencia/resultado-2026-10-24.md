# Resultado Spec 063: diferir el directorio de usuarios

## Cambio

El layout consulta informes solo para roles elegibles que aún no vieron el traspaso. Espera el resultado antes de marcarlo visto y solo habilita usuarios cuando encuentra un cierre; el directorio se consulta únicamente para roles con permiso de lectura. Para otros roles, el modal muestra el username guardado en el informe. `useEmployees` ya no activa el listado por defecto; `archiveEmployee` lo refresca justo antes de localizar la cuenta vinculada.

## Capturas

- Baseline: staging con frontend Spec 062, [detalle agregado](./baseline-2026-10-24.md) y [muestras crudas](./baseline/time-control-sync-phase-diagnostics.json).
- Final: staging reconstruido con frontend Spec 063, `2026-10-24T15:08:45.792Z`, tres contextos fríos, Chromium 412×823, CPU 4×; [muestras crudas](./final/time-control-sync-phase-diagnostics.json).
- En ambos registros se omitieron cuerpos de respuesta. El probe final solo guarda bytes de health/usuarios e indica con un booleano si había un cierre; no conserva datos de usuarios.

## Rendimiento

| Medición                         | Baseline mediana | Spec 063 mediana |               Cambio observado |
| -------------------------------- | ---------------: | ---------------: | -----------------------------: |
| Fase Usuarios                    |         263,1 ms |          46,2 ms |            −216,9 ms (−82,4 %) |
| Fase Empleados                   |           8,7 ms |         201,6 ms | La espera aparece en esta fase |
| Usuarios + Empleados por muestra |         266,4 ms |         258,8 ms |               −7,6 ms (−2,9 %) |
| Overlay visible                  |         435,1 ms |         420,5 ms |              −14,6 ms (−3,4 %) |
| FCP                              |           740 ms |           724 ms |                −16 ms (−2,2 %) |

En los tres contextos finales no había un informe cerrado: `/api/users` bajó de una solicitud y 636 bytes por contexto a cero solicitudes. El total de solicitudes API bajó de 20 a 19; las 57 respuestas finales fueron HTTP 200. Al retirar la espera de usuarios, la fase Empleados pasó a esperar su query ya activa. Las medianas combinadas y del overlay cambiaron poco; los rangos se solapan y tres muestras no prueban una mejora global de latencia ni de Core Web Vitals.

## Validación

- Tests dirigidos de automatización, permisos de informes, gate de empleados y archivado: 15/15.
- Typecheck frontend, lint frontend, `spec:check`, `docs:check` y `npm run preflight`: aprobados; ratchet ESLint 0/0.
- Probe Playwright staging: 1/1, tres contextos; ausencia de `/api/users` sin cierre, overlay bloqueante y readiness aprobados.
- Staging tras rebuild: frontend, backend, PostgreSQL y PgBouncer `healthy`; readiness `ready/healthy`; gateway HTTP 200.

## Siguiente paso

La fase Empleados tiene mediana observada de 201,6 ms, con `/api/employees` alrededor de 148–275 ms en browser. Medir bytes de esa respuesta y separar servicio/backend del tiempo de recepción y parseo antes de tocar la lista que usa Control Horario.
