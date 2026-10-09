import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // Suite contra staging (post-004): paralelismo calibrado a 2 workers
  // local (1 en CI) para garantizar que el número de sesiones concurrentes
  // del administrador no supere el límite del backend (10) y evite evicciones.
  workers: process.env.CI ? 1 : 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5174",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // webServer: {
  //   command: "cmd /c npm run dev -- --host 127.0.0.1 --port 4173",
  //   port: 4173,
  //   reuseExistingServer: !process.env.CI,
  //   env: {
  //     VITE_API_URL: process.env.E2E_API_URL || "http://127.0.0.1:4000/api",
  //   },
  // },
  projects: [
    // Funcionales en paralelo (ver workers). El spec de performance mide
    // tiempos de render: corre DESPUÉS y en serie, sin carga concurrente
    // que contamine las mediciones (bajo 4 browsers el scroll virtualizado
    // pasó de ~50ms a ~600ms solo por contención de CPU).
    {
      name: "functional",
      testIgnore: "**/performance.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "perf",
      testMatch: "**/performance.spec.ts",
      dependencies: ["functional"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
