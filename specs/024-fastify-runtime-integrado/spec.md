# Spec 024: Runtime integrado

- Estado: Implementada y validada localmente; sin commit
- Fecha: 2026-10-07
- Ruta: [roadmap](../roadmap-fastify.md)

## Problema

La superficie Socket.IO, jobs, OpenAPI y arranque debe integrarse al candidato Fastify para completar
la migración modular y disponer de contratos y pruebas mantenibles.

## Alcance

Un único servidor, ciclo de vida de pools y tareas, cierre y errores; sin duplicar jobs. Inventariar cada ruta real antes de implementar, incluidas las
anidadas. Compartir casos de uso entre los adaptadores cuando corresponda.

Fuera: módulos de otras specs y cambios de producto no declarados. Esta spec
es una previsión; no autoriza despliegues ni operaciones externas.

## Criterios de aceptación

- [x] AC1: Inventario no vacío con método, path, permisos, validación, respuestas y efectos de cada ruta/flujo.
- [x] AC2: BDD concreto y pruebas RED antes de implementar; comportamiento vigente y errores caracterizados.
- [x] AC3: Implementación con puertos tipados, límites públicos y sin dependencias de infraestructura en aplicación.
- [x] AC4: Paridad verificada con BD aislada donde aplique; contratos de seguridad y fallos comprobados.
- [x] AC5: Gates backend/frontend secuenciales, docs/SDK y ratchets aprobados; resultado con límites y rollback.

## Restricciones

Constitución I–V, Node 26, React/Vite y PostgreSQL se conservan. Usar
withDirectTransaction para transacciones interactivas. No reducir ratchets.
El cambio de servidor principal se reserva a 025. Para 025, AC3 exige además
retirar dependencias Express una vez demostrado el rollback.

## Trazabilidad

Dependencia confirmada: 023. Tests y archivos concretos se detallan en el plan y el resultado.

## Inventario confirmado 2026-10-07

| Superficie               | Contrato / efectos                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| GET /api-docs.json       | Público; mismo swaggerSpec generado; JSON, sin mutación                                                                         |
| GET /api-docs y assets   | Público; Swagger UI local; sin CDN ni dependencia src en dist                                                                   |
| GET/POST /socket.io/     | Engine.IO polling/websocket, mismo HTTP server; CORS legacy refleja origen, sin auth                                            |
| connection / disconnect  | query userId string se une a user:ID; broadcasts globales conservados                                                           |
| auto closures / rotation | Cada 5 min, locks job:processAutoClosures / job:rotateIndefiniteShifts, TTL 10 min, SYSTEM; skip fase 2                         |
| daily maintenance        | Hora host BACKUP_SCHEDULE_HOUR/MINUTE defaults 02:00; lock 60 min; backup opt-in lock 120 min, 3 intentos/5 min; rotación audit |
| startup                  | Huella antes de locks; 5 s: rotación, audit, scheduler, resumePendingOnStartup                                                  |
| scheduler                | Mantenimiento nocturno inmediato y próximo 00:00; reportes daily/weekly/monthly 24h/7d/30d; refresh idempotente                 |
| shutdown/restart         | SIGINT/SIGTERM drenan tareas, scheduler y seeder, sockets, export pool y DB; restart tras respuesta                             |

Las 123 rutas de módulos conservan sus contratos. Socket no utiliza middleware HTTP;
no afirmar que el gate de mantenimiento ni auth HTTP protege eventos.
Deudas: broadcasts de datos sin sesión y salas elegidas por cliente; locks sin heartbeat;
reportes sin lock distribuido, mes de 30 días, horario host y DST; jobs pueden tardar
al drenar porque no hay cancelación DB. Seeder timeout no cancela query y debe esperarse.
025 debe resolver seguridad socket y deudas de producto previas antes del cutover.

## SDD: ciclo de vida

La factory HTTP conserva su uso de inject y pools; el entrypoint integra sockets,
OpenAPI y runner explícitamente. onReady registra Socket.IO en app.server y espera
bootstrap antes de listen; preClose cancela timers/drena jobs y desconecta sockets;
onClose libera export pool lazy y DB aun si export falla. El host retira señales
antes de cierre y no hace process.exit antes de liberar recursos.
El bootstrap falla si no puede leer una huella string no vacía. Backup retry espera
cancelable; fallo de primera ejecución diaria conserva las ejecuciones siguientes.
Cada callback recurrente evita solaparse consigo mismo y registra rechazo.
Seeder usa promesas por job, espera queries cuyo timeout venció, y deja running
reanudable al cerrar en frontera de chunk. Pausa/resume no genera un segundo worker
mientras el primero drena. No hay garantía de cancelación ni cierre con plazo fijo.
La UI Swagger cambia a bootstrap JS externo compatible con CSP, mismos schemas.
Documento dist viene del artefacto generado y no busca comentarios en src ausente.

## Validación

[BDD](behavior.md), [plan](plan.md), [tareas](tasks.md), [resultado](result.md). El resultado distinguirá
ensayos directos, gateway, carga y rollback, sin afirmar mejora de rendimiento
sin comparación controlada ni envío real de correo.

## Corrección observada en staging: autenticación PgBouncer

El ensayo inicial falló con `cannot do SCRAM authentication: wrong password type`.
PostgreSQL exige SCRAM pero la imagen edoburu generaba credenciales MD5 por defecto.
Se declara AUTH_TYPE=scram-sha-256 en ambos compose con pooler, sin cambiar servidor
principal ni desplegar producción. La rama del entrypoint instalado conserva la
clave para SCRAM en lugar de convertirla a MD5; no exponer userlist ni env en logs.
Referencia primaria: [entrypoint edoburu](https://github.com/edoburu/docker-pgbouncer/blob/master/entrypoint.sh).

## Corrección de docs verificada por navegador

La primera UI Swagger devolvía assets 200 pero el navegador fallaba con
Invalid or unexpected token: HTML/JS no declaraban UTF-8. Se añade charset explícito
más meta, con RED de header y comparación exacta de bytes del bundle.
Docker copia dependencias antes que dist para conservar su capa al modificar código;
no se afirma una mejora medida de build a partir de una sola ejecución.
El barrido paralelo E2E encontró una navegación interrumpida; el mismo barrido
completo pasa solo (2 casos). La suite completa pasa con un worker, sin retries
ni cambios en permisos o presupuestos de sesión; ambos resultados están registrados.

## Correcciones descubiertas por carga

El harness obtuvo 401 al vencer el JWT Usuario en la rampa de 120 s; no se alarga
su duración. El runner ahora renueva fuera de escenarios cada 60 s, escribe token
en archivo privado/atómico y cada VU toma el vigente. Espera renovación y elimina
timer/archivo antes de limpiar worker/sesión. No comparte token con otros usuarios.
Se activa ensure moderno para exigir HTTP 200 en todas las respuestas, tráfico no
vacío y cero VU fallidos: maxErrorRate heredado no detectaba HTTP 401.
Referencia: [ensure](https://www.artillery.io/docs/reference/extensions/ensure).

La limpieza DELETE con Content-Type JSON y body vacío fallaba 400 solo en Fastify.
Se preserva Express aceptando vacío como undefined y delegando body requerido a
schema; JSON no vacío sigue parser nativo con protección proto/constructor y límites
por ruta. RED reproduce 400, GREEN exige 204 de usuarios y 400 de creación incompleta,
y prueba rechazo de **proto**. No transformar JSON inválido ni relajar body limits.

OpenAPI dist conserva PUBLIC_API_URL de runtime superponiendo servers sobre el
artefacto generado; RED del proceso compilado prueba que el documento horneado
no puede ignorar la variable. No modificar schemas/paths ni SDK por metadatos.

El ensure legacy de nivel config sobrescribía plugins.ensure en la CLI instalada;
se retira ese bloque para que los tres checks modernos sean efectivos. Una pasada
con token renovado obtuvo 1930 HTTP 200/300 VUs pero aún mostraba solo maxErrorRate;
La pasada final pasa con los tres checks visibles: 1930 respuestas HTTP 200,
300 VUs y cero fallidos. No certificar un gate por exit 0 sin leer métricas.
