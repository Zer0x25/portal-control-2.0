# Spec 008: Base Fastify y feriados completos

- Estado: Implementado — base y módulo candidato
- Fecha: 2026-10-06
- Autor: Codex
- Autorización: continuar con base Fastify, seguridad y auditoría reales y feriados completo.

## Problema y producto (PRD)

Preparar la migración completa del backend por módulos antes de producción.
El piloto GET no cubre sesiones reales, escrituras ni contexto de auditoría.
Esta entrega establece una base ejecutable y un módulo completo reutilizable.

## Alcance

Dentro: servidor candidato Fastify, configuración, CORS, headers, compresión,
rate limit, health, mantenimiento, errores, lifecycle, autenticación compartida,
feriados GET/POST/bulk/sync/DELETE y pruebas con PostgreSQL aislado.
Fuera: migración de todos los demás módulos, login HTTP Fastify, jobs/sockets
operativos en el candidato, cambio del servidor principal y despliegue.
Express conserva las rutas restantes hasta completar las siguientes entregas.

## Criterios de aceptación

- [x] AC1: base construible sin listen, con startup separado y cierre explícito de recursos.
- [x] AC2: JWT real, sesión activa, expiración, permisos persistidos y rechazo sin efectos.
- [x] AC3: contexto aislado entre peticiones; auditoría de escrituras atribuida al actor con Prisma extendido y transacción directa.
- [x] AC4: cinco rutas de feriados mantienen status, JSON, validación, auditoría y eventos; aplicación independiente de framework/DB/red/reloj global.
- [x] AC5: health bypass de límites y mantenimiento; body global 1 MiB y bulk 10 MiB; CORS sin credenciales, headers y errores consistentes.
- [x] AC6: enumeración de rutas no vacía y mutaciones validadas o justificadas; contratos Swagger/SDK actuales sin drift.
- [x] AC7: pruebas red/green, tipos estrictos, CI, cobertura e integración en BD desechable; comparar HTTP con la misma carga y documentar límites.

## Cambios explícitos de comportamiento

Payload JWT verificado estructuralmente y token por query solo si es string.
También se atribuye contexto al token Kiosk_Employee (antes omitido), sin modificar
su excepción de sesión ni las duraciones de AuthService.
Los parámetros auxiliares de consulta deben ser strings (se rechazan arrays),
y Fastify autentica antes de parsear body. 429 usa el envelope común de error
y headers del plugin; no se exige identidad de headers del limitador Express.
La respuesta Boostr se valida completa antes de escribir; un elemento malformado
rechaza el lote entero. Se conserva la semántica parcial ante fallo de BD durante
los upserts; esta entrega no convierte bulk/sync en operaciones atómicas.
