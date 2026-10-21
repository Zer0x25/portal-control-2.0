import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { createAuthSlice } from "./slices/authSlice";
import { createToastSlice } from "./slices/toastSlice";
import { createThemeSlice } from "./slices/themeSlice";
import { createDashboardSlice } from "./slices/dashboardSlice";
import { createNotificationSlice } from "./slices/notificationSlice";
import { createUxSlice } from "./slices/uxSlice";
import { createCorrectionRequestSlice } from "./slices/correctionRequestSlice";

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
        ...createDashboardSlice(set, get, api),
        ...createNotificationSlice(set, get, api),
        ...createCorrectionRequestSlice(set, get, api),
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

// Set up global event listener for unauthorized access
window.addEventListener("unauthorized", () => {
  useStore.getState().logout();
});

let rateLimitHandling = false;
window.addEventListener("rate_limited", () => {
  if (rateLimitHandling) return;
  rateLimitHandling = true;

  const state = useStore.getState();
  state.addToast(
    "Demasiadas peticiones detectadas. Espere unos segundos antes de intentar nuevamente.",
    "error",
    6000,
  );

  setTimeout(() => {
    rateLimitHandling = false;
  }, 3000);
});
