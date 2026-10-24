# Resultado Spec 065: filtrar empleados activos

## Decisión

Se descarta el cambio de producto. El probe autenticado comparó `GET
/api/employees` con `GET /api/employees?status=Activo` en tres contextos fríos.
Las seis respuestas midieron exactamente 75.926 bytes, así que el filtro no
redujo el payload con los datos actuales de staging y no alcanzó el umbral de
25%. El seed de staging no tiene empleados archivados que este filtro pueda
excluir.

## Evidencia

- Captura: `2026-10-24T15:30:58.254Z`, 412×823, Chromium, CPU 4×.
- Registro crudo: [tres muestras](./baseline/time-control-sync-phase-diagnostics.json).
- El request sintético activo solo se ejecuta con `PERFORMANCE_ACTIVE_EMPLOYEE_FILTER_PROBE=1`. El informe guarda bytes y un booleano que indica si el filtro activo estaba presente; omite el token y el cuerpo.
- Cada contexto vio 20 respuestas HTTP 200 incluyendo la solicitud diagnóstica.
- No se modificó el comportamiento del producto ni el contrato HTTP.

## Siguiente paso

Los consumidores de Time Control usan `id`, `name`, `area` y `workdayType`; la
lista completa incluye más campos. Medir una proyección con esos campos antes
de proponer un contrato de lectura liviano.
