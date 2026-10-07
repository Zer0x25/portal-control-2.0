# Resultado 024: Runtime integrado

Spec: [spec.md](spec.md). BDD: [behavior.md](behavior.md). Plan: [plan.md](plan.md).

Fecha: 2026-10-07. Estado: implementada y validada localmente; sin commit.
Commit anterior: `1fe261a feat(fastify): migrate administration and maintenance` (023).

## Entrega

Express y Fastify comparten runner con bootstrap de huella antes de locks,
telemetría y autocierre inicial/cada cinco minutos. Scheduler conserva un único
mantenimiento nocturno al refrescar reportes; se elimina el autocierre horario
redundante. Lifecycle puro inyecta timers, impide solapamiento por callback,
registra errores, cancela retry de backup y espera tareas activas al cerrar.
Una primera ejecución diaria fallida conserva las siguientes ejecuciones.

Fastify integra Socket.IO sobre app.server, OpenAPI y Swagger UI con assets locales.
La factory HTTP conserva su uso independiente de jobs/sockets. El host gestiona
señales y restart; se drenan jobs, scheduler y seeder antes de liberar recursos.
Seeder mantiene un worker por id, espera operaciones aún vivas tras timeout y
conserva running reanudable al cerrar en frontera de chunk. No cancela queries.

OpenAPI compilado usa el artefacto generado con PUBLIC_API_URL de runtime;
schemas/paths/SDK se conservan. Swagger declara UTF-8 y usa bootstrap externo
compatible con CSP. Gateway enruta /api-docs. PgBouncer declara AUTH_TYPE SCRAM
en ambos compose con pooler tras un fallo real contra PostgreSQL SCRAM.
Solo se ejecutó el staging propio; no se desplegó producción.

JSON vacío acepta undefined como Express; DELETE usuarios devuelve 204 y body
requerido/proto siguen rechazándose. El harness renueva JWT Usuario fuera de
escenarios cada 60 segundos, sin alargar sesiones; archivo privado/atómico y
cleanup. Se elimina ensure legacy que ocultaba las condiciones modernas.

## Evidencia local

| Gate                          | Resultado                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Backend validate:ci           | Formato, lint 0/0, tipos global/feriados/módulos strict, SDK, 9 schema tests y build aprobados                          |
| Backend coverage              | 487 pruebas / 57 archivos; ratchets: líneas 34.32%, funciones 36.58%, ramas 25.59%, statements 33.63%                   |
| Runtime focalizado            | 9 pruebas / 4 archivos: timers, locks, fase 2, fallos, señales y restart dev                                            |
| JSON/docs focalizados         | 61 pruebas / 2 archivos; UTF-8, bytes del bundle, JSON vacío/requerido y proto                                          |
| PG aislado completo           | 500 pruebas / 20 archivos; PostgreSQL 18.4 creado/eliminado por runner propio                                           |
| Frontend validate:ci:coverage | 276 pruebas / 71 archivos; tipos, formato, lint 0/0, cobertura y build/PWA aprobados                                    |
| Gateway candidato             | Readiness, contrato OpenAPI exacto y websocket aprobados                                                                |
| Swagger UI                    | Render real en Chrome con assets locales/CSP y sin pageerrors                                                           |
| E2E completo                  | 45/45 con un worker, sin retries, contra gateway/PgBouncer/Fastify y build frontend                                     |
| Carga final                   | 300 VUs, 1930 respuestas, todas HTTP 200, cero VUs fallidos; p95 8.9 ms, p99 13.9 ms                                    |
| Gate de carga                 | Tres checks visibles aprobados: respuestas >0, HTTP 200 = respuestas, VUs fallidos =0; controles 401 fallan y 200 pasan |
| Restart real                  | API responde antes del cierre; Docker RestartCount=1; readiness/OpenAPI/websocket aprobados después                     |
| Rollback real                 | Base compose recupera Express; readiness/OpenAPI/websocket y 2/2 smoke aprobados                                        |

Backend y frontend CI se ejecutaron secuencialmente. SDK y contrato generado sin
diff; no cambios de dependencias ni Prisma. RED de lifecycle precedió su
implementación. RED adicionales cubrieron charset, JSON vacío y PUBLIC_API_URL
en proceso compilado; GREEN tras sus correcciones.

Integración incluye listener real polling/websocket, cierre del singleton,
workers persistidos running -> resume -> completed con motor acotado por doubles,
y procesos dist reales que terminan exit 0 con SIGINT/SIGTERM.
No se enviaron correos ni ejecutaron backup/restore reales.

E2E inicial con cuatro workers: 41 pasan, una navegación interrumpida y tres no
corren; logs registran sesiones invalidadas. Barrido aislado 2/2 y suite completa
final 45/45 con un worker sin modificar auth ni presupuestos de sesión. Queda
la deuda del harness paralelo con admin compartido.

Carga inicial detectó 401 por JWT vencido y DELETE de limpieza 400 por JSON vacío.
Una pasada posterior produjo todos HTTP 200, pero solo mostraba el check legacy.
Solo la pasada final con los tres checks efectivos se certifica arriba.

Perf E2E: scroll promedio 111.82 ms (warning >50 ms, gate <500 ms aprobado), cambio
de tab 1226.20 ms (gate <15000 ms aprobado). No demuestra 60fps ni mejora frente
a Express. A11Y conserva el backlog permitido y los umbrales.

## Límites y rollback

Socket conserva CORS reflejado, ausencia de auth, salas elegidas por query userId
y broadcasts globales. Resolver antes de 025 junto con las deudas previas de
permisos, reset y secretos. La paridad no certifica seguridad de producción.
Reportes siguen sin lock distribuido; locks usan huella DB/TTL sin heartbeat.
Horario host, DST y meses de 30 días se conservan. Cierre espera operaciones lentas
sin plazo fijo ni cancelación SQL; no certifica consumo a largo plazo.

Express sigue principal. compose.fastify-staging.yaml es opt-in; rollback ensayado
omite el override y usa npm start. No hubo transformación de datos ni esquema.
Revertir 024 recupera el runner previo. El proyecto portal-024-rehearsal y sus
volúmenes fueron eliminados; se conservó la BD local preexistente. Se eliminaron
el env privado y los drivers temporales.
