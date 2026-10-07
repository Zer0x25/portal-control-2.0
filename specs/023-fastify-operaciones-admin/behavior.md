# BDD 023: Operaciones

Spec: [spec.md](spec.md).

1. Dadas las 21 rutas, sin sesión todas dan 401 y un rol no Admin da 403 antes
   de cualquier backup/restore/reset/seed/restart. JWT con claim antiguo usa rol BD.
2. Dado maintenance activo, admin/maintenance siguen autenticando y respondiendo;
   una ruta normal da 503 y health permanece accesible. Admin y maintenance no
   consumen limiter global; admin rechaza petición 1001/IP con 429 y Retry-After.
3. Dadas sesiones de varios usuarios, purge global conserva las del actor; purge
   dirigido elimina las del objetivo; inexistente 404. Reset password cambia hash
   y flag sin exponer hash ni contraseña, y mantiene sesiones legacy.
4. Dado backup correcto/fallido, start se adquiere antes y finish siempre libera
   después del intento. Restore correcto invalida sesiones y emite respuesta antes
   de solicitar restart; fallo no reinicia. Conflicto conserva operación anterior.
5. Dado clear iniciado, emite progress y resultado por líneas, sin compresión;
   timeout/fallo emite error y mantiene 200. Reinicio solo tras éxito. Reset real
   se prueba exclusivamente contra PostgreSQL desechable y se caracteriza CASCADE.
6. Dada seed/phase1, usa mismos defaults, watchdog y ALS SYSTEM_SEEDER/skipTrigger;
   fallo de job precreado se registra pero termina success. Fallo del motor emite
   error in-band. Timeout no cancela motor: deuda explícita.
7. Dado start/pause/resume/stop, persistencia conserva job/config/progress y logs;
   tests desactivan worker background para no dejar operaciones tras teardown.
   Status sin job devuelve null, logs sin id 400; id inexistente conserva 404; límite no numérico conserva 500.

## TDD

backend/tests/unit/operationsFlows.test.ts: cuatro casos RED con factories pendientes
(/tmp/portal-023-red.log) antes de implementación. GREEN sobre flujos extraídos.
Pruebas HTTP Express/Fastify y BD propietaria en
backend/tests/fastify-integration/operations.test.ts. Watchdog, procesos host y
reinicio se prueban mediante puertos/dobles; no se simula una restauración real.
