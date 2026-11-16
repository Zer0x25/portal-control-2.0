import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { createAuthSlice } from "./slices/authSlice";
import { createToastSlice } from "./slices/toastSlice";
import { createThemeSlice } from "./slices/themeSlice";
import { createUxSlice } from "./slices/uxSlice";

import { AppState } from "./types";
import { createSyncSlice } from "./slices/syncSlice";
import { createQuickNotesSlice } from "./slices/quickNotesSlice";
import { createSystemSlice } from "./slices/systemSlice";

import { sentryMiddleware } from "../utils/sentryMiddlewares";

export const useStore = create<AppState>()(
  sentryMiddleware(
    devtools(
      (set, get, api) => ({
        ...createAuthSlice(set, get, api),
        ...createToastSlice(set, get, api),
        ...createThemeSlice(set, get, api),
        ...createSyncSlice(set, get, api),
        ...createQuickNotesSlice(set, get, api),
        ...createUxSlice(set, get, api),
        ...createSystemSlice(set, get, api),
      }),
      { name: "AppStore" },
    ),
  ),
);

// --- Initial data loading ---
const state = useStore.getState();
state._verifyAuth();

// Apply theme on initial load
state._applyTheme(state.theme);

let rateLimitHandling = false;
window.addEventListener("rate_limited", (event: Event) => {
  if (rateLimitHandling) return;
  rateLimitHandling = true;

  const detail = (event as CustomEvent<{ retryAfter?: string | null }>).detail;
  const retrySeconds = detail?.retryAfter ? Number(detail.retryAfter) : NaN;
  const message =
    Number.isFinite(retrySeconds) && retrySeconds > 0
      ? `Demasiados intentos. Intente nuevamente en ${Math.ceil(retrySeconds)} segundos.`
      : "Demasiadas peticiones detectadas. Espere unos segundos antes de intentar nuevamente.";

  const state = useStore.getState();
  state.addToast(message, "error", 6000);

  setTimeout(() => {
    rateLimitHandling = false;
  }, 3000);
});
