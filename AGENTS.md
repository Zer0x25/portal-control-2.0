# Developer & AI Agent Guidelines (AGENTS.md)

This document provides conventions, operational commands, and architectural constraints for AI agents (including Google Jules) and contributors working on `portal-control`.

Express está retirado por decisión del usuario. No mantener ni recrear su runtime, controllers, routers, middleware, dependencias o pruebas de paridad. Toda corrección y validación HTTP se implementa exclusivamente en Fastify como único servidor HTTP.

---

## 1. Project Structure

- **`backend/`**: Node.js (v26), Fastify (único servidor HTTP), TypeScript, Prisma ORM, PostgreSQL (vía PgBouncer en transaction mode).
- **`frontend/`**: React 19, Vite, TypeScript, Zustand, TanStack Query, Tailwind CSS.
- **`compose.yaml`**: Stack de producción (PostgreSQL 18.4, PgBouncer, backend, frontend, gateway). `compose.db.dev.yaml` ejecuta solo PostgreSQL para desarrollo local con Vite/Fastify en el host.
- **PostgreSQL 18.4**:
  - `PGDATA` es `/var/lib/postgresql/<major>/docker`; el volumen se monta en `/var/lib/postgresql`.
  - Autenticación SCRAM-SHA-256 obligatoria (`--auth-host=scram-sha-256 --auth-local=scram-sha-256`).

---

## 2. Validation & Build Commands

Ejecutar dentro del paquete correspondiente para verificar cambios:

### Backend (`cd backend`)
```bash
npm ci
npx prisma generate
npm run check          # Type check & módulo guards
npm run lint           # ESLint
npm run check:sdk      # Verifica sincronía de swagger.json y SDK frontend
npm run validate:ci    # Suite completa de validación CI
```

### Frontend (`cd frontend`)
```bash
npm ci
npm run check          # Type check
npm run lint           # ESLint
npm run validate:ci    # Suite completa de validación CI
```

### Root
```bash
npm run lint:budget    # Verifica que el contador de warnings no supere el ratchet (0/0)
npm run docs:check     # Verifica enlaces relativos y consistencia de ADRs
```

---

## 3. Core Architectural & Security Invariants

1. **PgBouncer & Transacciones**:
   - PgBouncer corre en `POOL_MODE: transaction`.
   - Toda transacción interactiva o que configure variables de sesión (`set_config`) **debe** usar `withDirectTransaction` de `backend/src/services/db.ts` con `DIRECT_URL`.
   - Prisma 7 (ADR-0015): imports siempre desde `backend/src/generated/prisma/client`, nunca de `@prisma/client`.
2. **Prevención de N+1 (Bolt Journal)**:
   - Nunca ejecutar consultas iterativas (`findUnique`, `findFirst`) dentro de bucles sobre colecciones de registros.
   - Batch-fetch obligatorio con `findMany({ where: { id: { in: [...] } } })` o `schedulingService.getSchedulingContext(...)`.
3. **Seguridad y Comandos (Sentinel Journal)**:
   - Prohibido `child_process.exec` con interpolación de cadenas. Usar siempre `execFile` o `spawn` con array de argumentos.
   - Prohibido concatenar cadenas en `$executeRawUnsafe`. Usar `$executeRaw` parametrizado para `set_config`.
   - Fallback débil prohibido: secretos críticos (ej. `JWT_SECRET`) deben fallar explícitamente en el arranque si no están configurados.
   - Validar el lote completo (nunca validar rebanadas parciales como `.slice(0, 10)` para fechas, bloqueos o seguridad).
4. **Calidad de Código**:
   - Prohibido `console.log` en producción; usar loggers estructurados (`backend/src/utils/logger.ts` y `frontend/src/utils/logger.ts`).
   - Cero tolerancia a `any` en código de producción `src/`.

---

## 4. Commit Discipline & Releases

`release-please` parsea los commits bajo el estándar **Conventional Commits**:
- Formato estricto: `tipo(scope opcional): mensaje`. El tipo debe estar en la posición 0.
- **Prohibidos emojis** en el asunto (`🔒 fix: ...`, `⚡ perf: ...`), ya que rompen el parser de releases.
- El hook `commit-msg` (`scripts/commit-conventional.cjs`) valida esto localmente.

---

## 5. Quality Ratchets

El repositorio mantiene ratchets fijados en cero. No subirlos salvo decisión explícita:

| Ratchet | Archivo / Guard | Aplicación |
| :--- | :--- | :--- |
| **ESLint Warnings** | `lint-budget.json` (0/0) | `validate:ci`, pre-commit, CI |
| **Rutas sin validar** | `routeManifest` en `tests/fastify-integration/runtime.test.ts` | `test:fastify:integration` |
| **Cobertura de tests** | `backend/vitest.config.ts`, `frontend/vite.config.ts` | `test:coverage`, `verify-*` en CI |
| **Tamaño AGENTS.md** | `AGENTS.md` (≤ 120 líneas / ≤ 8 KB) | Anti-truncamiento de prompt global |

---

## 6. Reglas Modulares Especializadas (.agents/rules/)

Para mantener este archivo conciso y de alta atención, las guías de implementación profunda se cargan bajo demanda desde `.agents/rules/`:

- [agentic-governance.md](file:///.agents/rules/agentic-governance.md): Higiene de reglas, separación de documentación y presupuesto de tamaño para agentes.
- [database-architecture.md](file:///.agents/rules/database-architecture.md): Detalles de PgBouncer, locking `FOR UPDATE`, transacciones directas y consultas concurrentes.
- [api-contracts.md](file:///.agents/rules/api-contracts.md): Fastify routing, manifest, validadores `isRequestValidator` y sincronización OpenAPI/SDK.
- [type-safety-lint.md](file:///.agents/rules/type-safety-lint.md): Tipado estricto, Prisma `$extends`, `caughtError`, timezone de Chile y ratchet de linting.
- [ci-performance.md](file:///.agents/rules/ci-performance.md): Memoización de AST, aislamiento de dependencias y optimización tmpfs en bases de datos efímeras.
- [dependency-maintenance.md](file:///.agents/rules/dependency-maintenance.md): Cadencia mensual de actualización, aislamiento de jobs y dependencias retenidas (holds).

### Política de Higiene de Reglas (Anti-Rule Creep)
1. **AGENTS.md es Always-On**: Debe mantenerse estrictamente en ≤ 120 líneas.
2. **Prohibido agregar bitácoras o playbooks en AGENTS.md**: Campañas temporales, tablas de "antes vs después" y deudas específicas de módulos pertenecen a `specs/` o `docs/`.
3. **Reglas modulares bajo demanda**: Nuevas guías de dominio deben crearse en `.agents/rules/<dominio>.md` con frontmatter `trigger: model_decision`.

Memorias institucionales:
- [.jules/bolt.md](file:///.jules/bolt.md): Bitácora de optimizaciones de performance y latencia.
- [.jules/sentinel.md](file:///.jules/sentinel.md): Bitácora de vulnerabilidades y blindaje de seguridad.
- [specs/roadmap-fastify.md](file:///specs/roadmap-fastify.md) y [specs/025-fastify-cutover/backlog.md](file:///specs/025-fastify-cutover/backlog.md): Estado de especificaciones, contratos de módulos y mejoras post-cutover.
