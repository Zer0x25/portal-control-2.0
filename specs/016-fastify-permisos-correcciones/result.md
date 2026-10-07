# Resultado 016: Permisos y correcciones

Estado: Implementado y validado localmente.
La tanda anterior 014/015 quedó en commit 9d8e101, con hooks aprobados, sin push.

## Entrega

Ocho rutas Fastify nativas: tres leaves y cinco corrections. Express comparte
flujos puros con puertos neutrales; API pública index.ts y strict en ambos módulos.
Los controllers quedan delgados. LeaveRecordSchema.parse se conserva en ambos
adaptadores, mientras correcciones recibe cuerpo original validado. Roles,
status/envelopes y message-only 403 de ownership se mantienen. Reloj_Control
puede gestionar ausencias pero no resolver correcciones.

No reescritura de LeaveService/CorrectionService, schema, dependencias ni SDK.
Aprobación conserva withDirectTransaction y claim pending condicional. Helpers
AppError/toCaughtError son puros y están permitidos explícitamente por el guard.
No se añaden consultas por fila en aplicación ni se bajan ratchets.

## Evidencia

Backend validate:ci aprobado: formato/lint 0/0, tipos globales/strict, SDK sin
cambios, nueve tests de schemas y build. Cobertura backend aprobada: 353/353
tests en 44 archivos, sin reducir umbrales.

Cuatro tests RED antes de implementar (/tmp/portal-016-red.log); GREEN para
paginación/envelopes, errores de ausencia, ownership y actores/historial.
Guards enumeran aplicaciones y rutas no vacías, imports públicos/strict y efectos
prohibidos; tests negativos de manifiesto extra/faltante, auth y validación.
Límite 1 MiB rechazado antes de efectos para ambos POST.

PostgreSQL desechable: 215/215 tests en once archivos, incluidos 40 de esta
spec (20 por transporte). Ejecuta casos con permisos/sesiones
reales. Ausencias: fechas Chile, materialización/sellado, marcación previa, edición,
limpieza/tombstones, siete días, archivo 24h, inmutabilidad y solapamiento legacy.
Correcciones: ISO válido/invalidación, own/foreign, list/stats/history/fallback,
rechazo con motivo, delta, idempotencia, campo inválido y actor persistido.

Cinco aprobaciones concurrentes regresan approved, con una auditoría de edición,
una de estado y un evento de cada tipo; el registro queda corregido y completo.
Trigger BEFORE UPDATE provoca fallo de marcación: estado de solicitud vuelve a
pending, no hay eventos de éxito ni auditoría de edición. BD y triggers se eliminan;
no usa conexiones de BD locales ni envíos externos.

Frontend validate:ci:coverage aprobado: 276/276 tests en 71 archivos,
tipos/lint/formato/cobertura/build/PWA. Docs (123 Markdown, 19 ADR), specs (25),
secrets (0 secretos) y git diff --check aprobados. Validación local, sin CI remoto.

## Deudas y límites

Hallazgo reproducido en ambos servidores: al extender ausencia, cleanup archiva
filas sin entrada y materializeDays no restablece isDeleted. La prueba caracteriza
el tombstone retenido, junto a precedencia de una marcación existente. Corregir
reactivación y consistencia en una spec explícita antes del cambio principal.

Ausencias permiten solapamientos y no validan orden inicio/fin; materialización,
limpieza, sellado y ausencia no son una transacción conjunta. Consultas por fila
internas heredadas requieren una revisión aparte; no replicarlas en módulos nuevos.
Correcciones conserva deudas de ownership: no coteja employeeId con timeRecordId;
Usuario sin vínculo no restringe lectura/stats/history y quiosco no tiene scope.
No se presenta paridad como garantía de seguridad suficiente para cutover.

currentValue no se remapea a originalValue, attachment no se persiste y resolvedBy
puede diferir del actor auditado. Queries legacy tienen validación manual/marcador
z.unknown; salidas genéricas conservan tipos inferidos y payloads, sin serializers
nuevos. No se demuestra sellado de integridad del parche aprobado en esta spec.
Auditoría/eventos conservan límites existentes y no garantizan entrega de sockets.

Express principal. Sin staging/PgBouncer/gateway/e2e/carga comparativa ni listeners
jobs/sockets. Ningún despliegue o push. No se promete mejora de rendimiento.

## Mantenimiento y rollback

Aplicación: modules/leaves/application y modules/corrections/application.
Composición: services/leaveFlows.ts y services/correctionFlows.ts. HTTP: módulos
http y dos controllers. Pruebas: leaveCorrectionFlows.test.ts y
leavesCorrections.test.ts. Revertir plugin/entrega sin migración de BD.
Quedan nueve specs 017–025; siguiente entrega: reportes de turno (017).

Logs: /tmp/portal-016-backend-ci.log, /tmp/portal-016-coverage.log,
/tmp/portal-016-integration.log, /tmp/portal-016-green.log,
/tmp/portal-016-frontend-ci.log. Ratchets se conservan.
