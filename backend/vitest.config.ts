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
    // Ratchet de cobertura (spec 003 G-02, AC2). Baseline medido 2026-10-02
    // sobre `npm run test:coverage` (unit, sin DB): 16.47% líneas, 19.1%
    // funciones, 9.48% ramas, 15.84% statements. Umbrales con ~2pts de
    // margen anti-flakiness: solo pueden subir. Subir cobertura real va
    // por spec aparte (fuera de alcance de 003).
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts", "scripts/**"],
      thresholds: {
        lines: 14,
        functions: 17,
        branches: 8,
        statements: 14,
      },
    },
  },
});
