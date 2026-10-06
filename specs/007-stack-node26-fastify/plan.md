# Plan 007: Entregas y verificación

Spec: [spec.md](./spec.md).

## Estrategia

1. Actualizar solo snapshot del contrato de correo; revisar diff semántico.
2. Ejecutar `npm update` con listas de paquetes explícitas, separadas por paquete.
3. Instalar Node 26 para esta sesión; configurar `.nvmrc`, engines, CI y Docker.
4. Ejecutar spec 006: red del caso de uso, green y delegación de fachada.
5. Red del piloto GET Fastify, implementar plugin y comparar con Express.
6. Validar paquetes secuencialmente y construir imágenes locales, sin desplegar.

## Archivos y contratos

Snapshot en `backend/tests/__snapshots__/api-contract.test.ts.snap`; manifests y
lockfiles de ambos paquetes; `.nvmrc`, `.github/workflows/ci.yml`, Dockerfiles;
`backend/src/modules/holidays/`, fachada y tests. Docs en specs, README y ADR.

El schema de correo y SDK ya estaban sincronizados; el arreglo cambia la
expectativa obsoleta, no el payload productivo. Nuevo gate `check:holidays`
corre dentro de `check` y `validate:ci`, con `strict` y `noImplicitAny`.

## Riesgos y rollback

Node 26 puede revelar incompatibilidades nativas: probar host y Alpine. La
selección de Node 26 es explícita; no afirmar que ya es LTS antes de su fecha.
Los lockfiles permiten revertir paquetes. Revertir fachada devuelve consulta
al legado; retirar el plugin piloto no cambia rutas productivas.

## Verificación

Todos los comandos locales de paquetes se ejecutan con `fnm exec --using 26`:

1. Backend: `npm run validate:ci`, después `JWT_SECRET=test-secret npm run test:coverage`.
2. Frontend: `npm run validate:ci:coverage`, después del backend.
3. Raíz: `npm run spec:check`, `npm run docs:check`, `git diff --check`.
4. Docker: build de backend y frontend con imágenes Node 26 Alpine.

No hay `.env.staging` en este checkout: no ejecutar integración de BD/e2e contra
un entorno improvisado. Documentar esa limitación y el smoke pendiente.
