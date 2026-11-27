import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Spec 122 / ADR-0033: el panel "Component tests" (addon-vitest) arranca un
 * Vitest en el propio dev server filtrado por el proyecto `storybook`, que
 * solo existe con STORYBOOK_TESTS=1 (frontend/vite.config.ts). Sin la flag,
 * el addon muere con "No projects were found" en cada arranque, así que se
 * registra bajo la misma flag que gobierna el proyecto. La suite headless
 * `npm run test:storybook` no depende de este registro.
 */
const addons: StorybookConfig["addons"] = [
  "@storybook/addon-docs",
  "@storybook/addon-a11y",
  "@storybook/addon-mcp",
];

if (process.env.STORYBOOK_TESTS === "1") {
  addons.push("@storybook/addon-vitest");
}

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons,
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  core: {
    builder: {
      name: "@storybook/builder-vite",
      options: {
        viteConfigPath: "./vite.config.ts",
      },
    },
  },
  docs: {
    autodocs: "tag",
  },
};

export default config;
