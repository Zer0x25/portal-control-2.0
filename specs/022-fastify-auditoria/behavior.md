# BDD 022: Auditoría

Spec: [spec.md](spec.md).

1. Dada sesión Admin y logs persistidos, al filtrar actor/categorías/recordId y
   paginar, ambos adaptadores devuelven las mismas filas y cursor sin duplicados.
2. Dado Fiscalizador, puede consultar, exportar y ver estado; verificar/limpiar
   devuelve 403. Supervisor/Reloj/Usuario no leen auditoría. Sin sesión: 401.
3. Dado POST válido con actor/IP/metadata falsificados, se persiste el actor de
   sesión y la IP del request; se ignoran id/timestamp/metadata del cliente.
   Falta de campos obligatorios devuelve 400; persistencia fallida mantiene 201.
4. Dados logs antiguos y recientes, cleanup default 6 elimina solo los antiguos;
   months 0/121/fracción/no numérico devuelve 400 sin borrar. String "1" conserva
   coerción explícita. Se comprueba DELETE real solo en BD desechable.
5. Dados caracteres XML/CSV y filtros repetidos, export JSON/CSV/XML contiene
   registros seleccionados y escapa contenido; actor malicioso se parametriza.
   Format desconocido vuelve a JSON. Export JSON fallido devuelve 500 con código.
6. Dada verificación sobre BD vacía o una cadena sin hash, se espera el servicio,
   actualiza snapshot y registra resultados. Fallo devuelve 500. Dos verificaciones
   simultáneas mantienen usuarios ALS y audit.username distintos tras awaits.
7. Dado exportador fallido antes de bytes, devuelve error HTTP; tras bytes,
   termina respuesta parcial sin añadir JSON. Un cursor inválido puede fallar
   después de la cabecera CSV/XML y mantiene ese comportamiento heredado.

## TDD

backend/tests/unit/auditFlows.test.ts: cuatro casos RED por factory pendiente,
antes de implementar (log /tmp/portal-022-red.log); GREEN tras extracción.
Paridad: backend/tests/fastify-integration/audit.test.ts sobre PostgreSQL 18.4
creado y eliminado por runner aislado. Guards verifican inventario, auth,
marcador de validación, límites de imports y strict.
