/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import "./index.css";
import { initSentry } from "./utils/sentry";
import { installFetchGuards } from "./services/fetchGuards";
import { logger } from "./utils/logger";

// Inicializar Sentry
void initSentry();
installFetchGuards();

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
import App from "./App";
import { AppProviders } from "./contexts/AppProviders";
import ErrorBoundary from "./components/ErrorBoundary";

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

// Limpiar flag de recarga por error de chunk si la app carga bien
if (window.sessionStorage.getItem("chunk-load-reloaded")) {
  window.sessionStorage.removeItem("chunk-load-reloaded");
}

root.render(
  <AppProviders>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </AppProviders>,
);
