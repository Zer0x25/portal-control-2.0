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
    actionTimeout: process.env.CI ? 10_000 : 0,
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
      testIgnore: [
        "**/performance.spec.ts",
        "**/visual-regression.spec.ts",
        "**/design-system-visual.spec.ts",
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    // Regresion visual (spec 035 T15): corre despues de los funcionales
    // (incluido axe-core) y antes de `perf`, que necesita serie sin carga
    // concurrente. Solo sobre el conjunto curado de visual-targets.ts.
    //
    // `timezoneId` fija la zona de negocio de la app (America/Santiago): sin
    // ella, el runner y el CI renderizan horas distintas y el baseline nunca
    // coincide consigo mismo (spec 035 T14).
    {
      name: "visual",
      testMatch: "**/visual-regression.spec.ts",
      dependencies: ["functional"],
      use: {
        ...devices["Desktop Chrome"],
        timezoneId: "America/Santiago",
        colorScheme: "light",
      },
    },
    // `perf` depende de `visual` para forzar el orden funcional -> visual ->
    // perf: las mediciones de render no se contaminan con la carga de la
    // regresion visual (spec 035 T15).
    {
      name: "perf",
      testMatch: "**/performance.spec.ts",
      dependencies: ["functional", "visual"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
