import { mergeConfig } from "vitest/config";
import viteConfig from "./vitest.config";

export default mergeConfig(viteConfig, {
  test: {
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.integration.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    isolate: true,
  },
});
