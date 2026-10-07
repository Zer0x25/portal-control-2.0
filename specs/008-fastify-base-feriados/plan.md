# Plan 008: Contratos, invariantes y límites (SDD)

Spec: [spec.md](./spec.md). Comportamiento: [behavior.md](./behavior.md).

## Contratos

`buildFastifyApp` recibe dependencias explícitas y no arranca jobs ni abre puertos.
`createFastifyRuntime` compone DB/servicios existentes. `main.ts` configura el
puerto y escucha; `onClose` cierra Prisma. Autenticación comparte caso de uso
con Express y consulta sesiones/usuario usando el cliente extendido existente.

Feriados usa API pública del módulo, repositorios inyectados, proveedor Boostr
y puertos de auditoría/eventos/identificadores/reloj. La fachada legacy delega.
La aplicación no importa infraestructura. La extracción no crea pools ni usa
transacciones interactivas fuera de `withDirectTransaction`.

Validación HTTP reutiliza Zod; el resultado parseado de body es tipado.
GET conserva el since numérico y el mapping existente. Error mapper compartido
mantiene AppError/Prisma/JWT/Zod y añade errores del parser Fastify.
Los plugins ajenos no dan acceso implícito: rutas privadas requieren auth.

## Invariantes

Contexto AsyncLocalStorage nuevo por petición, sobreviviendo await; username
persistido antes de handler. Roles supervisor solo para mutaciones. Health
se registra fuera del scope limitado y del gate de mantenimiento.
Guardas usan onRoute, no introspección de internals Express ni listas vacías.
Sin cambios a schema Prisma, SDK, contratos de otros módulos ni ratchets.

## Verificación

Tests puros primero en rojo; tests HTTP con JWT firmado y repositorio local;
integración con PostgreSQL 18.4 desechable, migrations y cliente real; comparación
Express/Fastify sobre GET autenticado y mismo dataset. CI de paquetes secuencial,
docs/spec gates. No tratar benchmark local como garantía de capacidad productiva.
