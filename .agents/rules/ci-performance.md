---
trigger: model_decision
description: Best practices and performance constraints for CI workflows, monorepo isolation, and ephemeral test databases.
---

# CI & Test Performance Guidelines

1. **Architecture & AST Tests**:
   - Always memoize TypeScript AST parses (`ts.createSourceFile`), file reads, and parsed `tsconfig` across test suites evaluating module boundaries.
   - Avoid re-reading or re-parsing the codebase in iterative assertions.

2. **Monorepo CI Isolation**:
   - Never install dependencies (`npm ci`) in sibling packages inside single-package CI workflows.
   - Package-specific validation jobs must declare their own tools in `devDependencies` or run tools via exported PATH (`backend/node_modules/.bin`).
   - The `cache-dependency-path` of `actions/setup-node` must strictly target the tested package's lockfile (`<pkg>/package-lock.json`) to prevent cache busts.

3. **Disposable Database Containers**:
   - Always use `--tmpfs /var/lib/postgresql:rw` for ephemeral integration test PostgreSQL containers.
   - Configure `-c shared_buffers=256MB -c checkpoint_timeout=30min` to run the database entirely in RAM and avoid disk I/O bottlenecks in CI.

4. **Docker Image Pre-fetching**:
   - In CI jobs requiring heavy images, trigger `docker pull <image> &` in the background immediately after repo checkout to overlap network I/O with Node/dependency setup.

5. **Release-Gated Docker Builds & E2E Smoke**:
   - Production Docker image builds (`docker buildx`) and full browser E2E smoke tests (`compose.staging.yaml` + Playwright) must **never** run on everyday pushes to `main`, feature PRs, or automated bot PRs (e.g. Jules).
   - Everyday CI (`ci.yml`) is strictly restricted to fast validation: `gates`, `verify-backend` (with ephemeral PostgreSQL tmpfs), and `verify-frontend` (~2.5 min total).
   - E2E smoke tests and GHCR image publishing belong exclusively to the **Release Pipeline** (`deploy.yml`), triggered only when merging an official release PR from `release-please` (`chore(main): release ...`) or publishing version tags (`v*`).
   - In the release pipeline, E2E smoke acts as a strict deployment gate: images are built once, validated with Playwright, and only pushed to GHCR / pinned in `compose.yaml` if all tests pass.

6. **Consolidated CI Validation (`validate:ci:coverage`)**:
   - Packages must provide a consolidated `validate:ci:coverage` script combining formatting checks, lint budget (0/0), strict type-checks, SDK contract verification, and the single full coverage test suite with ratchets.
   - Avoid executing test subsets (e.g. `test:schemas-refactor`) prior to `test:coverage` inside CI to prevent duplicate test runs.
   - Keep lightweight `validate:ci` for local developer workflows and `.husky/pre-push` hooks.

7. **High-Speed Dependency Installation**:
   - All `npm ci` invocations in GitHub Actions workflows must use `--no-audit --no-fund --prefer-offline --loglevel=error` to maximize cache hits and eliminate redundant network overhead and noisy step logs.

8. **Playwright E2E Invariants & Headless Automation**:
   - **Límites de Concurrencia de Sesiones**: En `playwright.config.ts`, la concurrencia debe limitarse a `workers: process.env.CI ? 1 : 2`. Esto previene sobrepasar el límite de sesiones activas del backend (`sessionLimitForRole = 10`), evitando evicciones de tokens y redirects espurios a `/` por 401.
   - **Sincronización de Arranque vs Overlays (`InitialSyncOverlay`)**:
     - Prohibido falsear `localStorage.setItem("lastSyncTime", ...)` en helpers como `loginFast` para saltarse pantallas de carga; esto engaña al motor de delta sync (`since = lastSyncTime`) y causa que la base de datos local quede vacía sin empleados ni turnos.
     - En tests headless, esperar deterministamente la disolución del overlay con `await expect(page.getByText(/sincronizando entorno/i)).not.toBeVisible({ timeout: 15000 })` antes de interactuar con la interfaz.
   - **Localizadores Unívocos Anti-Colisión**: En aserciones de modales, evitar `getByText` con selectores genéricos (ej. nombres de la aplicación) que colisionen con los encabezados persistentes del `Header`, usando roles y encabezados semánticos (`getByRole("heading", { name: ... })`).
