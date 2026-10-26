# Resultado Spec 095: evitar reaplicar el tema del bootstrap

- Estado: verificado en staging local.
- Fecha: 2026-10-25.
- Frontend staging: `sha256:35d8cf6b557ec50f9b5509b834858d919dc8f5ed453823456de88391e7bd91d2`.
- Backend, base de datos, PgBouncer y gateway no se reconstruyeron; health API
  respondió `healthy` y gateway `200`.

## Cambio

`_applyTheme` compara la clase oscura actual con el tema resuelto. Si ya
coinciden, actualiza `effectiveTheme` solo si cambió y retorna. Esto evita
insertar el estilo `#disable-transitions`, leer estilos computados y programar
su limpieza al iniciar una página con tema oscuro ya aplicado por el bootstrap
de `index.html`. Cuando el tema sí cambia, se conserva el comportamiento de
transición.

La prueba de unidad falló antes del cambio porque encontró la inserción
redundante. Después pasan las dos pruebas del slice: el camino idempotente y el
cambio real de tema.

## Medición

El perfil CDP base de Spec 094 registró `_applyTheme` con 12,165 ms muestreados
en una de tres visitas; en los tres perfiles posteriores no volvió a aparecer.
La auditoría E2E con preferencia oscura confirmó `darkThemeApplied=true` y cero
inserciones del estilo transitorio.

El CPU activo mediano fue 803,027 ms antes y 790,952 ms después, pero las
muestras individuales variaron entre 786,828–821,467 ms antes y 730,827–799,163
ms después. La variación impide atribuir la diferencia total a este cambio. No
se midió Lighthouse/TBT en esta iteración y no se afirma una mejora global de
rendimiento.

## Regresiones cubiertas

- El E2E de Dashboard no descargó el chunk de Control horario ni los chunks de
  modales, zona horaria o auto inicio.
- Las tres visitas móviles frías conservaron una sola solicitud por chunk; el
  chunk de Control horario empezó 141,6–152,5 ms antes de que terminara
  `PersistentLayout`.
- Cada visita de Control horario registró 12 requests API, todos HTTP 200; el
  editor de marcas no se descargó.
- Suite E2E dirigida: 3/3; auditoría de tema: 1/1; Vitest del slice: 2/2.
- TypeScript frontend, ESLint de archivos fuente, Prettier, `spec:check` y
  `docs:check` pasaron. El preflight completo también pasó: scan de secretos,
  specs, documentación, Prettier Markdown, lint budget 0/0 y TypeScript backend
  y frontend.

## Evidencia guardada

- [`theme-bootstrap-audit.json`](./theme-bootstrap-audit.json)
- [`dashboard-eager-chunks.json`](./dashboard-eager-chunks.json)
- [`time-control-route-chunk-waterfall.json`](./time-control-route-chunk-waterfall.json)
- [`time-control-production-cpu-after-2026-10-25.json`](./time-control-production-cpu-after-2026-10-25.json)
- Base comparativa: [perfil CPU de Spec 094](../../094-time-control-parallel-route-chunks/evidencia/time-control-production-cpu-after-2026-10-25.json).
