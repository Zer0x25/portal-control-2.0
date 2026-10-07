# Resultado 006: Consulta extraída y comparación Fastify

Fecha: 2026-10-06. Node local: 26.10.0. React + Vite y PostgreSQL permanecen.

## Extracción y TDD

La fachada `HolidayService.getHolidays` compone el caso de uso y adaptador con
el cliente Prisma extendido existente. La consulta no importa DB, Express,
Fastify, sockets ni helpers de tiempo. Se inyectan repositorio, reloj, estado
del autosync y función de sincronización. Lectura, filtros, metadatos, errores
y efectos de autosync mantienen B1–B6.

- Red: ocho tests del nuevo caso de uso fallaron con el error explícito de
  capacidad no implementada; imports y setup ya funcionaban.
- Green: nueve tests pasan, sin mocks de módulos, red real ni fake timers.
  La novena prueba pasó por un rojo/verde adicional para preservar el cambio
  de año del host durante la consulta de presencia.
- Red Fastify: seis tests de comparación fallaron ante la ausencia de ruta.
- Green Fastify: seis tests pasan con plugin GET implementado.
- Guardas: doce tests, incluyendo fixtures de imports prohibidos, efectos,
  reloj global, entrada privada, enumeración no vacía y gate estricto.

`npm run check:holidays` verifica todo `src/modules/holidays/` con `strict: true`
y `noImplicitAny: true`; forma parte de la validación CI. El build backend
también deja de emitir si hay errores (`noEmitOnError: true`).

## Coste y archivos de cambio

Antes: una consulta embebida en un servicio de 254 líneas que también escribe,
sincroniza HTTP y publica efectos. Ahora el núcleo se entiende leyendo
`application/contracts.ts` y `application/getHolidays.ts`; el mapeo DB vive en
`infrastructure/prismaHolidayRepository.ts`. La fachada compone dependencias.

Antes, las pruebas aisladas de consulta dependían de mocks de módulos y del
reloj/entorno global; después, los nueve tests del caso de uso solo inyectan
dobles locales. La baseline anterior de 25 tests tardó 1,98 s con Node 24; la
medición posterior separa ejecución pura y transporte bajo Node 26. Son suites
y runtimes diferentes: no se atribuye una mejora de velocidad a esos tiempos.

Se añaden contratos y un adaptador: aumenta el número de archivos, pero el
caso de uso puede probarse con dobles locales sin importar infraestructura.
El autosync completo sigue en legado y debe extraerse en una entrega posterior.

| Cambio                     | Express con extracción                     | Piloto Fastify                                               |
| -------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| Regla de consulta          | Caso de uso compartido + test              | Mismo caso de uso + test                                     |
| Mapeo Prisma               | Adaptador + contratos si cambia su entrada | Mismo adaptador                                              |
| Parámetros HTTP            | Controller y schema de rutas               | Plugin con schema y mapping                                  |
| Prueba HTTP                | Router Express real + Supertest            | `fastify.inject`, sin abrir puerto                           |
| Auth y errores productivos | Middleware existente                       | Requiere composición equivalente; el piloto usa hooks/dobles |
| Despliegue                 | Servidor actual                            | Pendiente: plugin no montado                                 |

Las seis pruebas HTTP comparan cuatro consultas válidas, rechazo de auth y
error del caso de uso: status, JSON y opciones recibidas. Auth se simula en
ambos transportes; no se afirma equivalencia de sesiones/JWT/auditoría.
El test usa el router Express real para conservar validación y montaje actuales.

Medición orientativa de una ejecución local: nueve tests puros del caso de uso,
14,4 ms de ejecución; seis tests de comparación conjunta, 411,7 ms. Excluye setup
global del runner. No es un benchmark de throughput Express frente a Fastify.

## Conclusión del piloto

La extracción permite mantener la misma regla en ambos transportes. Fastify
facilita pruebas HTTP mediante inyección y coloca schema/handler juntos; introduce
composición nueva para los controles globales. Continuar la migración requiere
una spec para auth/sesiones, errores, auditoría/contexto, rate limits, health,
multipart, sockets, OpenAPI y estrategia de gateway. No cambiar el tráfico
productivo con esta sola evidencia.

## Validación final

- Backend `validate:ci`: PASS bajo Node 26, incluyendo gate estricto y SDK sin cambios.
- Backend coverage: **169/169 tests en 31 archivos**; líneas 20,24%, funciones
  24,07%, ramas 14,16%, statements 19,77%; ratchets existentes pasan.
- Frontend `validate:ci:coverage`: **276/276 tests en 71 archivos**, coverage y build PASS.
- Snapshot global de correo corregido: solo `SendTestEmail`, sin modificar esquema o SDK.
- Docker frontend con Node 26: build PASS y `nginx -t` PASS.
- Docker backend final: compilación PASS; exportación Docker tar PASS. El exporter
  habitual falló al desempaquetar por un snapshot de caché ausente; no se ejecutó prune.
  La exportación alternativa se cargó correctamente. Smoke del contenedor: importación
  de la app compilada y de `@sentry/profiling-node` PASS con Node 26.10.0. No ejecuta
  migraciones, seed o consultas de BD; no sustituye un smoke HTTP en staging.
- Docs/spec gates y diff: PASS.
- Staging/e2e no ejecutados: este checkout no contiene `.env.staging`.

Las validaciones backend/frontend se ejecutaron secuencialmente. No se desplegó.

## Dependencias actualizadas

| Paquete                                   | Antes → después   |
| ----------------------------------------- | ----------------- |
| Backend: typescript-eslint parser/plugin  | 8.71.0 → 8.71.1   |
| Backend: express-rate-limit               | 8.7.0 → 8.7.1     |
| Backend: nodemailer                       | 10.0.14 → 10.0.15 |
| Frontend: typescript-eslint parser/plugin | 8.71.0 → 8.71.1   |
| Frontend: plugin-react                    | 6.1.1 → 6.1.2     |
| Frontend: cssnano                         | 9.2.1 → 9.3.2     |
| Frontend: idb                             | 8.0.3 → 8.0.4     |
| Frontend: jsdom                           | 30.1.1 → 30.1.2   |
| Frontend: nanoid                          | 6.0.1 → 6.0.2     |
| Frontend: postcss                         | 8.5.28 → 8.5.29   |
| Frontend: vite                            | 8.3.2 → 8.3.3     |

Fastify 5.12.5 se añadió para el piloto. Prisma 7.10.0, TypeScript 5.9.3,
Babel 7 y PWA 1 permanecen; `npm outdated` no muestra más actualizaciones
compatibles pendientes (excluyendo el caso conocido de `@types/exceljs`).
