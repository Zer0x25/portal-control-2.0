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
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts", "scripts/**"],
      thresholds: {
        lines: 15,
        functions: 18,
        branches: 8,
        statements: 14,
      },
    },
  },
});
