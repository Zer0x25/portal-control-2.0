# Spec 020: Medidores, notas y configuración

- Estado: Implementada y validada localmente
- Fecha: 2026-10-06
- Ruta: [roadmap](../roadmap-fastify.md)

## Necesidad y entrega (PRD)

Migrar catorce rutas al candidato Fastify y compartir flujos con Express,
conservando límites separados entre meters, notes y configs. Incluye lecturas
por lote, notas rápidas, configuración, cierre contable y reglamento PDF público.
Express sigue principal; jobs, sockets conectados al candidato y cutover están fuera.
No cambiar esquema Prisma ni SDK/OpenAPI; agregar plugins oficiales multipart/static
para carga streaming y descarga con semántica HTTP de archivos.

## Contrato, invariantes y límites (SDD)

S = Administrador, Supervisor_Elevado, Supervisor, Reloj_Control.
A = solo Administrador. Sesión = cualquier sesión persistida; Pública = sin sesión.
Body JSON 1 MiB; PDF un archivo campo file, MIME application/pdf, máximo 15 MiB.
Routers validan sin reemplazar body; notas y medidores vuelven a parsear explícitamente
antes de los servicios. Se valida la colección entera, sin slices parciales.

| Método | Path                                    | Permiso | Validación                   | Respuesta                               | Efectos                                      |
| ------ | --------------------------------------- | ------- | ---------------------------- | --------------------------------------- | -------------------------------------------- |
| GET    | /api/meters                             | S       | MeterReadingQuerySchema      | 200 success/data, pagination opcional   | lectura/count                                |
| POST   | /api/meters/bulk                        | S       | BulkMeterReadingSchema array | 201 success/data                        | inserts y meter:updated count                |
| GET    | /api/notes                              | S       | QuickNoteQuerySchema         | 200 success/data                        | lectura/delta updatedAt                      |
| POST   | /api/notes                              | S       | QuickNoteSchema parse        | 201 success/data                        | create y quickNote:created                   |
| PUT    | /api/notes/:id                          | S       | id string no vacío           | 200 success/data raw                    | archive y quickNote:updated                  |
| DELETE | /api/notes/:id                          | S       | id string no vacío           | 200 success/message                     | delete y quickNote:deleted                   |
| GET    | /api/configs/public/company-policy      | Pública | sin query funcional          | 200 metadata/url o 404 message          | lectura                                      |
| GET    | /api/configs/public/company-policy/file | Pública | sin query funcional          | 200 PDF inline, rangos/condicionales    | lectura de archivo por basename              |
| POST   | /api/configs/company-policy             | A       | multipart, file/MIME/tamaño  | 201 metadata/message/url                | archivo, config/audit/event, borrar anterior |
| GET    | /api/configs/server-time                | Sesión  | sin query funcional          | 200 iso/timestamp/timezone/businessDate | reloj en servicio                            |
| GET    | /api/configs/validate-closure           | A       | date string no vacío         | 200 allowed/details                     | consulta bloqueadores                        |
| GET    | /api/configs                            | Sesión  | sin query funcional          | 200 array sin envelope                  | lectura y filtrado por rol                   |
| GET    | /api/configs/:key                       | Sesión  | key string no vacío          | 200 JSON arbitrario/null                | lectura y protección por key                 |
| POST   | /api/configs/:key                       | A       | body value unknown           | 200 JSON arbitrario                     | upsert, auditoría y config:updated           |

SMTP_CONFIG y EMAIL_NOTIFICATION_RULES solo se leen con Administrador o
Supervisor_Elevado, incluso con claim JWT de rol antiguo. Usuario puede leer
otras keys y server-time, pero no gestionar medidores/notas ni escribir configs.
FORBIDDEN de servicio se traduce a 403. LOCK_DATE_BLOCKED se traduce a 400 con
mensaje específico, sin details; futuro conserva 500. IDs inexistentes notas: 404.
Archivo excedido: 413 FILE_TOO_LARGE; MIME/campo inesperado/ausente: 400.
Policy faltante conserva 404 con únicamente message. Aplicación usa puertos
neutrales de parsing, reloj, archivos y servicios, sin frameworks/DB/global clock.

## Criterios de aceptación

- [x] AC1: Inventario completo, incluidos PDF público y multipart.
- [x] AC2: BDD concreto y cuatro fallos RED antes de implementación.
- [x] AC3: Tres módulos públicos con aplicación pura y adaptadores compartidos.
- [x] AC4: Paridad de persistencia, permisos, efectos, archivos y errores en BD aislada.
- [x] AC5: Gates secuenciales, ratchets, docs/SDK y resultado verificable.

## Deudas y cambios declarados

Medidores usa Promise.all de inserts sin transacción: validación completa no hace
atómico un fallo DB. Autor viene del cliente. id/timestamp entrantes se ignoran;
month solo está en schema y no filtra; fechas extra se usan sin schema; numericString
admite NaN/valores no positivos, que pueden terminar en 500. Fin de rango mezcla parse UTC y fin de día local: en Chile, 2026-01-02 a
2026-01-02 excluye una lectura de ese día a las 12:00Z. No replicar estos patrones en nuevo dominio.

Notas conserva autor del cliente, hard delete sin tombstone, notas archivadas en
list y respuesta archive raw sin campos sync que sí van por socket.
Configs protege solo dos keys; Admin puede acceder a configuración SMTP por
ruta genérica sin enmascarado, comportamiento heredado. CONFIG_SET almacena valores
en auditoría; revisar datos sensibles antes de cutover. Write/audit/event no son
atómicos. Cierre futuro es error genérico 500; cálculo fallback de lock dinámico.

PDF se valida por MIME, sin verificar firma/contenido. Meta publicada incluye
filename/uploadedBy. Archivo se escribe antes del upsert: falla DB puede dejar
archivo huérfano; eliminación anterior es best effort. Basename impide rutas de
metadata fuera de carpeta, pero no es verificación de symlinks. Nombre generado
por Fastify usa UUID opaco .pdf, en vez de timestamp/aleatorio de Multer; cambio
interno declarado. No usar memoria para acumular el archivo completo en producción.

## Trazabilidad

[Plan](plan.md), [BDD](behavior.md), [tareas](tasks.md). Dependencia: 019.
Constitución I–V; Node 26, React/Vite/PostgreSQL y ratchets sin reducción.

Cambio correctivo declarado: Express sendFile recibe basename y root explícitos
en vez de ruta absoluta, para que la descarga funcione en un checkout bajo
carpetas ocultas (.codex). Mantiene carpeta autorizada y política dotfiles del
archivo final, sin habilitar publicación del directorio.
