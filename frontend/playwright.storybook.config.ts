import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/design-system-visual.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["./scripts/storybook-visual-reporter.cjs"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:6006",
    colorScheme: "light",
    timezoneId: "America/Santiago",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run storybook -- --no-open",
    url: "http://127.0.0.1:6006/iframe.html",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
