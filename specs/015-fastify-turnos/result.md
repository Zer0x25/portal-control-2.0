# Resultado 015: Turnos y cierre de tanda 014/015

Estado: Implementado y validado localmente. Sin commit, push ni deploy.

## Entrega

Dieciocho rutas Fastify nativas y flujos compartidos Express en módulo shifts,
con aplicación strict, puertos neutrales y parser Chile inyectado. Dos controllers
Express quedan como adaptadores. Servicios vigentes conservan reglas, persistencia,
auditoría, sincronización y eventos. No hay schema, SDK ni dependencias nuevos.
MonthlyShiftService alinea el tipo rest con entrada HTTP que ya trataba como descanso.

Tanda total: 27 rutas (nueve records, dieciocho shifts). PRD/SDD/BDD/tasks y TDD
por spec; [resultado de marcaciones](../014-fastify-marcaciones/result.md).
Cuatro tests de flujos fallaron antes de implementar cada módulo. RED 015:
/tmp/portal-015-red.log. Aplicación GREEN incluye rechazo de matriz sin vínculo.

## Comprobaciones

Backend validate:ci: formato, lint 0/0, strict/global, SDK sin diff, nueve tests de
schemas y build. Cobertura backend: 333/333 tests, 43 archivos, ratchets sin bajar.
Pruebas de límites: simple 1 MiB, bulk 10 MiB en records y ambos bulks shifts;
exceso se rechaza antes de invocar aplicación. Manifiestos exactos, no vacíos,
autenticación declarada y validación/manual markers para entradas heredadas.

PostgreSQL desechable: 175/175 tests en diez archivos; 56 de turnos (28 por
servidor). Compara permisos persistidos, CRUD, borrado/sync/eventos,
conflictos inclusivos, lotes con última fila inválida y scopes de ambos servidores.
Trigger provoca fallo al crear patrón mensual después de eliminar asignación:
la transacción directa revierte los cambios previos. Matriz de once empleados
usa getSchedulingContext una sola vez y contexto en todas las consultas diarias.
Recorrido conjunto crea empleado/patrón/asignación y entrada real: comprueba
snapshot de horarios/horas e integridad de la cadena. Correo de atraso sustituido,
sin envíos reales. Servicios de planificación y punch usan PostgreSQL real.

Frontend validate:ci:coverage: 276/276 tests en 71 archivos, tipos/lint/formato,
cobertura y build/PWA aprobados. Docs (121 Markdown/19 ADR), specs (25), secrets
(0 secretos) y git diff --check aprobados. Gates locales; no CI remoto ejecutado.

## Cambios de contrato y límites

Cambio declarado: matriz Usuario/Kiosk_Employee sin empleado vinculado devuelve
403 antes de scheduling, en lugar de pasar ID nulo a Prisma. Pruebas unitarias
cubren ambos roles y PostgreSQL verifica ausencia de vínculo.

Defecto heredado descubierto: vista mensual consulta medianoche UTC y el servicio
la interpreta en Chile como el día previo. Se conserva y caracteriza en ambos
servidores; endpoint diario y plan persistido se comprueban por separado. La vista
mensual también conserva consultas por día existentes; la matriz usa contexto
batch. Corregir ambos puntos en una spec explícita de fechas/rendimiento antes
del cambio principal. No se introduce ningún nuevo algoritmo de consulta en bucle.

Assignments limita Usuario con vínculo, pero sin vínculo conserva consulta sin
filtro; Kiosk_Employee tampoco se restringe allí. Calendarios sí restringen ambos
roles. Resolver esa deuda de autorización explícitamente antes de cutover.
parseInt permisivo, dailySchedules string, campos extra y endDate opcional
mantienen contratos heredados. Validadores z.unknown marcan rutas con controles
manuales; no implican schema estricto de todas las queries. Salidas genéricas
conservan tipos inferidos desde servicios, sin serializers nuevos.

Servicios internos no se reescriben; transacciones/efectos siguen sus límites
actuales. Auditoría, eventos y operaciones masivas no ganan atomicidad ni garantía
de entrega de sockets. Express sigue principal. No staging/gateway/PgBouncer,
e2e completo, carga comparativa ni arranque de sockets/jobs en esta tanda.

## Mantenimiento y siguiente entrega

Aplicación: modules/shifts/application; HTTP: modules/shifts/http y controllers.
Composición: services/shiftFlows.ts; pruebas: shiftFlows.test.ts y shifts.test.ts.
Revertir plugin/entrega sin migración de BD. Siguiente: spec 016, permisos y
correcciones, con inventario antes de implementar. Quedan diez specs 016–025.

Logs de cierre: /tmp/portal-015-backend-ci.log, /tmp/portal-015-coverage.log,
/tmp/portal-015-integration.log, /tmp/portal-015-frontend-ci.log.
