/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import "./index.css";
import { initSentry } from "./utils/sentry";
import { initWebVitals } from "./utils/webVitals";
import { logger } from "./utils/logger";

// Inicializar Sentry
void initSentry().then(initWebVitals);

import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("Nueva versión disponible. ¿Recargar?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    logger.log("App lista para trabajar offline");
  },
});

import React from "react";
import ReactDOM from "react-dom/client";
import App, { preloadTimeControlPageFromCurrentHash } from "./App";
import { AppProviders } from "./contexts/AppProviders";
import ErrorBoundary from "./components/ErrorBoundary";
import { RenderProfiler } from "./utils/RenderProfiler";

// Performance mode: disables expensive visual effects unless explicitly disabled.
const perfMode = String(import.meta.env.VITE_UI_PERF_MODE ?? "high").toLowerCase();
if (perfMode === "high") {
  document.documentElement.setAttribute("data-ui-perf", "high");
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

preloadTimeControlPageFromCurrentHash();

// Limpiar flag de recarga por error de chunk si la app carga bien
if (window.sessionStorage.getItem("chunk-load-reloaded")) {
  window.sessionStorage.removeItem("chunk-load-reloaded");
}

const appContent = <App />;
const appShell = <ErrorBoundary>{appContent}</ErrorBoundary>;

const developmentTree = (
  <RenderProfiler id="app:root">
    <RenderProfiler id="app:providers">
      <AppProviders>
        <RenderProfiler id="app:shell">
          <ErrorBoundary>
            <RenderProfiler id="app:application">{appContent}</RenderProfiler>
          </ErrorBoundary>
        </RenderProfiler>
      </AppProviders>
    </RenderProfiler>
  </RenderProfiler>
);

root.render(import.meta.env.DEV ? developmentTree : <AppProviders>{appShell}</AppProviders>);
