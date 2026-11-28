---
name: ci-preflight
description: >
  Ejecuta el preflight del repositorio para validar gobernanza, formato, lint,
  tipos y pruebas locales antes de abrir un PR.
---

# Preflight de CI

Ejecuta los comandos desde la raíz del repositorio.

| Comando                       | Validación                                                               |
| ----------------------------- | ------------------------------------------------------------------------ |
| `npm run preflight`           | Gobernanza, formato Markdown, lint y tipos en los dos paquetes.          |
| `npm run preflight -- --pr`   | Gobernanza, formato Markdown y suites locales de los paquetes afectados. |
| `npm run preflight -- --full` | Pasada completa de backend, frontend y Storybook.                        |

Ejecuta el modo `--pr` antes de abrir un PR, subir cambios a su rama o solicitar su fusión a `main`. El script combina el diff de la rama desde su ancestro común con `origin/main` y los cambios locales, incluidos archivos nuevos. La salida indica los paquetes seleccionados. Un cambio compartido selecciona ambos paquetes. Un cambio en `backend/docs/swagger.json` activa los checks de frontend y backend. Si Git no puede calcular el diff, el script ejecuta la pasada completa.

La gobernanza y, cuando corresponde, la verificación del SDK se comprueban primero. `check:sdk` regenera Swagger y los tipos de frontend. Si están seleccionados ambos paquetes y hay al menos cuatro CPU lógicas disponibles, el resto de backend y frontend se valida en paralelo. Las pruebas de frontend y Storybook se mantienen en serie dentro de su paquete. Para ejecutar la misma selección en serie, añade `--serial`, por ejemplo `npm run preflight -- --full --serial`.

- **Repositorio**. Escaneo de secretos, integridad de specs y ADR, formato de Markdown de gobernanza y de la documentación afectada.
- **Backend**. Lint con presupuesto cero, tipos, formato, sincronía del SDK, `test:unit:ci` y `test:schemas-refactor`.
- **Frontend**. Lint con presupuesto cero, tipos, formato, manifiesto del catálogo, tokens, auditoría del sistema de diseño y `test:run:ci`. Los cambios que pueden afectar el catálogo o sus pruebas activan además `test:storybook`.

Corrige los errores en el código. El presupuesto de lint se mantiene en cero salvo decisión explícita. El hook `commit-msg` comprueba Conventional Commits, por ejemplo `fix(auth): cerrar sesión al expirar el token`.

Registra en el PR el escenario probado, su resultado y cualquier pendiente. GitHub Actions ejecuta build y cobertura en los paquetes afectados, además de la integración HTTP de Fastify con PostgreSQL efímero si cambia backend.

[Script de preflight](./scripts/preflight.cjs)
