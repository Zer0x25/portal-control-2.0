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
