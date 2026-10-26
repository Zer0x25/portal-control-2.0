# Resultado: gating de consultas de auto-inicio

## Cambio

`useLoginAutomations` solo habilita el grupo de consultas de programación cuando la combinación de rol, empleado y cargo puede iniciar un turno: `Reloj_Control` con empleado, o `Administrador`/`Supervisor_Elevado` cuyo empleado tenga cargo `Reloj_Control`. Los demás consumidores de `useScheduling` mantienen las consultas habilitadas por defecto. La automatización espera que asignaciones, patrones, feriados y licencias terminen de cargar antes de marcar el intento como completado.

## Requests de Dashboard

En el baseline, Dashboard hizo 20 requests a 20 endpoints únicos. El usuario de staging `admin` no tiene empleado asociado; aun así, el shell pidió 10 endpoints exclusivos del cálculo de auto-inicio: cinco configuraciones, patrones, asignaciones, feriados, licencias y correcciones.

Tras reconstruir frontend, tres ejecuciones secuenciales hicieron 10 requests a 10 endpoints únicos cada una. Las 10 rutas de programación estuvieron ausentes en las tres; los requests restantes respondieron HTTP 200 y no hubo endpoints duplicados. La reducción observada es de 10 endpoints por arranque (50%).

## Tiempos y límites

El contenido principal apareció a 519–615 ms en dos muestras base y 517–687 ms en tres posteriores. El reloj apareció a 526–646 ms en la base y 537–693 ms después. Los rangos se solapan y las muestras son pequeñas; no se atribuye mejora de latencia ni de Core Web Vitals al cambio.

Capturas posteriores completas: [muestra 01](./runs/sample-01/dashboard-startup-api-requests.json), [02](./runs/sample-02/dashboard-startup-api-requests.json) y [03](./runs/sample-03/dashboard-startup-api-requests.json). Comparación y límites: [comparison.json](./comparison.json); resumen del baseline: [dashboard-startup-before.json](./dashboard-startup-before.json).

Imagen frontend posterior: `sha256:000841f7cf368c64b4e44fb9b1fd8373142c2516aa58a00f14d17e9d552ebfa9`.

## Validación

- Regresiones unitarias enfocadas: 13/13.
- E2E de requests de Dashboard: 3/3 en staging local.
- Health gateway: 200; frontend healthy.
- `frontend/npm run check`: pasó.
