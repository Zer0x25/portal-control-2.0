import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Separación de tests por directorios
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Configuración para tests de integración (secuencial por defecto si detecta DB o podemos forzarlo)
    sequence: {
      concurrent: false,
    },
    // Ratchet de cobertura (spec 003 G-02, AC2). Baseline remedido
    // 2026-10-03 sobre `npm run test:coverage` (unit, sin DB) con Vitest 5:
    // 17.1% líneas, 20.16% funciones, 10.45% ramas, 16.44% statements.
    // Umbrales con ~2pts de margen anti-flakiness: solo pueden subir.
    // Subir cobertura real va por spec aparte (fuera de alcance de 003).
    // Spec 004 fase 2 (2026-10-03): +14 tests de ShiftValidator
    // (tests/unit/shiftValidator.test.ts) -> 18.14% L, 21.03% F,
    // 11.25% B, 17.51% S. Ratchet 15/18/8/14 -> 16/19/9/15.
    // +11 tests de reglas de dominio (tests/unit/domainRules.test.ts:
    // attendanceRules + schedulingRules, puras sin DB) -> 18.96% L,
    // 21.77% F, 12.51% B, 18.41% S. Ratchet -> 17/20/10/16.
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts", "scripts/**"],
      thresholds: {
        lines: 17,
        functions: 20,
        branches: 10,
        statements: 16,
      },
    },
  },
});
