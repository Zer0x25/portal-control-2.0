# Resultado 013: Empleados en Fastify

Estado: Implementado y validado localmente. Sin push ni deploy.

## Entrega

Seis rutas nativas Fastify de empleados; flujos list/create/update/bulk compartidos
con Express. Aplicación tipada y pura, consumidores públicos por index.ts,
check:modules y guard no vacío de superficie/permisos/validadores.

Alta conserva withDirectTransaction (timeout 15s/maxWait 5s), empleado y cuenta
sobre el mismo cliente. Prueba real fuerza error tras crear usuario y comprueba
rollback de ambas filas, sin auditoría/evento exitoso de empleado. Mantiene
proyección pública sin PIN y seis campos del quiosco. Excel comparte generador
por Writable/PassThrough; pruebas abren XLSX y verifican columnas, filas y headers.

La ruta 013–025 y doce borradores posteriores están creados; próximos módulos no
implementados. 014–023 agrupan los otros 16 routers; 024/025 runtime y cutover.

## Evidencia

RED: cuatro pruebas fallaron con stub no implementado antes de los flujos:
/tmp/portal-013-red.log. GREEN: backend 307/307 pruebas en 41 archivos, cobertura líneas 25.72%,
funciones 32.21%, ramas 19.13% y statements 25.22%; ratchets conservados.
PostgreSQL: 87/87 pruebas en ocho archivos; 26 corresponden a empleados,
13 escenarios por servidor. Frontend: 276/276 pruebas en 71 archivos,
tipos/lint/formato/cobertura/build Vite/PWA aprobados después del SDK.

Backend validate:ci aprobado: formato, lint 0/0, strict, SDK sin cambios,
schemas 9/9 y build. Docs: 117 markdown/19 ADR; specs: 25; secretos: 0
(31 coincidencias permitidas). git diff --check aprobado.

Logs locales: /tmp/portal-013-backend-ci.log, /tmp/portal-013-coverage.log,
/tmp/portal-013-integration.log, /tmp/portal-013-frontend-ci.log,
/tmp/portal-013-docs.log, /tmp/portal-013-spec.log, /tmp/portal-013-secrets.log.
El guard de bodyLimit usa dobles de puertos; paridad CRUD/Excel y rollback
usan HTTP real y PostgreSQL. No se confunden estas dos clases de prueba.

## Límites y hallazgos

Sin staging/PgBouncer, gateway, e2e completo, listener Socket.IO, jobs ni carga
comparativa de empleados. Pruebas usan emisión de SocketService como límite,
no entrega a clientes conectados. PostgreSQL 18.4 es desechable, sin tocar BD local.
Sin migración Prisma, cambios de dependencias ni contrato/SDK nuevos.

Preserva de forma explícita: bulk por chunks no atómico; carrera del correlativo;
update/sync no atómicos; ensure puede emitir user:updated y auditar cuenta antes
del commit (el rollback de filas no revierte esos efectos); auditoría changes.pin;
status libre/numericString pueden generar 500; respuesta de reactivación anterior
al reset de PIN en BD. Corregir exige alcance de producto/seguridad y pruebas
propias. La validación de entrada conserva campos legacy no declarados en schema.

Eventos de empleado se emiten en el caso de uso antes de enviar respuesta HTTP;
antes el controller emitía inmediatamente después de res.json. Entrega a socket
no es transaccional ni confirmada. No se promete rollback de eventos, seguridad
total ni mejora de rendimiento por adoptar Fastify.

## Mantenimiento y rollback

| Cambio futuro         | Archivos principales                                | Prueba                       |
| --------------------- | --------------------------------------------------- | ---------------------------- |
| Reglas de alta/update | modules/employees/application/flows.ts              | employeeFlows.test.ts        |
| Persistencia/tx/actor | services/employeeFlows.ts, EmployeeService.ts       | employees.test.ts PostgreSQL |
| Permisos/schema/HTTP  | modules/employees/http/routes.ts, employeeRoutes.ts | Paridad Express/Fastify      |
| Excel                 | StreamExportService.ts, httpStream.ts               | XLSX abierto y comparado     |

Express sigue principal. Revertir entrega o retirar registro candidato; no hay
migración BD nueva que revertir. Siguiente implementación prevista: spec 014.
