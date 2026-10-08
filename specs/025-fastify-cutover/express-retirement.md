# Retiro definitivo de Express

Decisión del usuario, 2026-10-07: Fastify será el único servidor HTTP. Se elimina
la fixture de paridad local y se deja de extender Express en las tandas siguientes.
Las specs y ADR anteriores conservan la evidencia histórica de la migración.

## Implementación

- El build limpia `dist` antes de compilar, para no conservar adapters borrados.
- Eliminados `app.ts`, `express-main.ts`, routers, controllers y middleware Express.
- Eliminados Express, middleware, Multer, Supertest y sus tipos de las dependencias
  de desarrollo y del lockfile. No existe `dev:express`.
- EmployeeService obtiene el principal desde la API pública de auth, sin request
  Express. Los módulos puros, fachadas y runtime Fastify conservan sus contratos.
- Las anotaciones OpenAPI pasan a `src/platform/openapi/operations.ts`; generar
  Swagger/SDK no requiere código del servidor retirado. No cambia el contrato JSON.
- El benchmark HTTP ejecuta solo Fastify y guarda nuevos resultados fuera de la
  evidencia histórica de la comparación de migración.

## Pruebas

Las suites de integración nativas conservan permisos, transacciones, concurrencia,
fechas, errores, multipart, PDF/XLSX, sesiones/MFA/PIN, jobs y sockets. Se elimina
la segunda ejecución de cada caso sobre Express. Auth y feriados usan expectativas
sobre Fastify, sin comparar una respuesta consigo misma o arrancar un segundo stack.

Se retiran los tests específicos de adapters Express: controllers admin, feriados,
KPI e importación; middleware de errores, permisos y validación; endpoints legacy
de auth, correcciones, leaves, export y health. Sus contratos se verifican en las
suites de aplicación y Fastify existentes. Se conservan pruebas de servicios,
esquemas, contexto y concurrencia, incluido el race real de fichajes. Los tests
puros de CORS y cambio forzado de contraseña permanecen; los límites HTTP y uploads
se verifican en Fastify. La regresión health degraded/200 por backup obsoleto
se trasladó a una prueba HTTP nativa con PostgreSQL real.

El guard de arquitectura enumera código y tests, prohíbe imports/dependencias de la
pila retirada y comprueba que sus adapters no reaparezcan. El runtime real exige
un manifiesto no vacío, validación de todas las mutaciones y coincidencia de cada
método/ruta con OpenAPI. No se rebajan los presupuestos de lint ni cobertura.

No se despliega, no se migra una BD del usuario y no se hace push. Cualquier
rollback histórico requiere otro checkout; el proyecto actual no incluye otro
runtime HTTP. El trabajo pendiente de admisión universal y reset/restore continúa
exclusivamente en Fastify después de cerrar este retiro.

## Evidencia de validación

- Backend CI y Swagger/SDK correctos; contrato generado sin diff.
- 387 pruebas de integración nativa en 18 archivos sobre PostgreSQL desechable.
  El menor conteo retira la doble ejecución Express y fixtures antiguas, sin
  conservar un segundo servidor.
- Frontend CI con cobertura correcto: 280 pruebas en 75 archivos.
- 562 pruebas unitarias/contrato en 68 archivos, con cobertura: líneas 37,56%,
  statements 37,21%, funciones 40,09%, ramas 30,99%; thresholds originales intactos.
- Benchmark Fastify completado en tres procesos independientes: 600 requests
  autenticados por ronda, concurrencia 16, todas HTTP 200 y contrato verificado.
  PostgreSQL desechable eliminado al finalizar. No mide capacidad de producción.
- Build limpio sin `dist/express-main.js`, controllers, routers ni middleware
  retirados. `npm ls` no encuentra Express, Supertest, Multer ni swagger-ui-express.
- Docs, specs, secretos y diff correctos.
