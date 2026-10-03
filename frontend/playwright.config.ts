import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // Spec 004 fase 3: la suite comparte estado (límite de 1 sesión para rol
  // Usuario, attendance muta records del día, login rate-limit por IP).
  // En paralelo los tests se expulsan entre sí: serial siempre, en CI y local.
  workers: 1,
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
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
