import { createElement, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { Decorator, Preview } from "@storybook/react-vite";
import "../src/index.css";
import "./preview.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

interface ThemeCanvasProps {
  isDark: boolean;
  density: "compact" | "standard" | "spacious";
  children: ReactNode;
}

const ThemeCanvas = ({ isDark, density, children }: ThemeCanvasProps) => {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.dataset.storyDensity = density;
    return () => {
      document.documentElement.classList.remove("dark");
      delete document.documentElement.dataset.storyDensity;
    };
  }, [density, isDark]);

  return createElement(
    "div",
    { className: "min-h-screen bg-token-surface-app p-6 text-token-text-primary" },
    children,
  );
};

const withProjectTheme: Decorator = (Story, context) =>
  createElement(
    ThemeCanvas,
    {
      isDark: context.globals.theme === "dark",
      density: context.globals.density ?? "standard",
    },
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, null, createElement(Story)),
    ),
  );

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Tema de los tokens semánticos del proyecto",
      defaultValue: "light",
      toolbar: {
        title: "Tema",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Claro" },
          { value: "dark", title: "Oscuro" },
        ],
      },
    },
    density: {
      description: "Densidad de espaciado para revisar las variantes industriales",
      defaultValue: "standard",
      toolbar: {
        title: "Densidad",
        icon: "menu",
        items: [
          { value: "compact", title: "Compacta" },
          { value: "standard", title: "Estándar" },
          { value: "spacious", title: "Espaciosa" },
        ],
      },
    },
  },
  decorators: [withProjectTheme],
  parameters: {
    a11y: { test: "error" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
