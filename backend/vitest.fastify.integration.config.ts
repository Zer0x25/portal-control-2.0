import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "tests/fastify-integration/**/*.test.ts",
      "tests/integration/auth.login-flow.test.ts",
      "tests/integration/auth.logout-flow.test.ts",
      "tests/integration/auth.kiosk-pin-flow.test.ts",
      "tests/integration/session-limit-race.test.ts",
    ],
    maxWorkers: 1,
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 20000,
  },
});
