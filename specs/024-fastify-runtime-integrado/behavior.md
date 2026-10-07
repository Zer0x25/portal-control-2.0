# BDD 024: Runtime integrado

Spec: [spec.md](spec.md).

1. Dado un runtime iniciado, al iniciar otra vez no se duplican timers. Al cerrar,
   se cancelan timers, se esperan tareas pendientes y luego se cierran recursos;
   un rechazo se registra y no causa unhandledRejection.
2. Dado un reporte actualizado varias veces, refreshScheduler conserva un único
   mantenimiento nocturno y elimina el autocierre horario duplicado: el runner
   compartido conserva autocierre cada cinco minutos con lock y pausa por seeder.
3. Dado un servidor candidato escuchando, Socket.IO usa el mismo listener para
   polling y websocket. Conserva broadcast y sala user:ID por query sin autenticar
   (deuda de seguridad explícita, pendiente antes de 025). Un segundo propietario
   se rechaza. Cierre desconecta clientes y libera el singleton.
4. Dado el contrato OpenAPI vigente, GET /api-docs.json devuelve el mismo objeto
   y /api-docs sirve UI y assets locales también en dist sin depender de src.
5. Dado SIGINT/SIGTERM o fallo del listen, cierre es idempotente y retira handlers.
   Restart utiliza ese cierre; en dev toca el entrypoint del servidor activo.
6. Dado un worker fase 2, cierre impide nuevos lanzamientos, espera operaciones
   activas y conserva estado running para reanudación; no cierra DB antes del worker.

Cambios correctivos declarados: eliminar timers duplicados, absorber errores de
callbacks, resolver huella antes de locks, seguimiento y drenaje de tareas y restart.
No cambiar permisos HTTP, formatos de reportes, scopes ni autenticar sockets en esta entrega.

7. Dado el navegador cargando Swagger UI, HTML y JS anuncian UTF-8 para que el
   bundle Unicode no se interprete como windows-1252. La prueba runtimeDocs
   demuestra RED de charset ausente antes de corregir headers y meta.

8. Dado DELETE con Content-Type JSON vacío, usuarios devuelve 204 como Express;
   creación sin campos sigue 400, JSON corrupto/prototype poisoning sigue rechazado
   y límites 1 MiB/10 MiB no cambian. RED de JSON vacío registrado antes de corrección.
9. Dado carga de 120 s con Usuario de JWT corto, renovaciones ocurren fuera de VUs;
   el gate exige respuestas 200 y tráfico no vacío. Controles HTTP 401/200 devuelven
   exit 1/0 respectivamente, sin reutilizar BD ni secretos de producción.
