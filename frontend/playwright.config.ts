import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // Suite contra staging (post-004): el cuello de botella era el boot por
  // test (~2-4s c/u), no los logins (loginFast = 1 POST ~200ms). Paralelismo
  // seguro: admin admite 10 sesiones y el rate-limit de login se limpia en
  // cada éxito (ráfagas OK); la única sesión de 1 slot es la del rol Usuario
  // (user-flows.spec.ts corre .serial en un solo worker). CI se queda en 1.
  workers: process.env.CI ? 1 : 4,
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
