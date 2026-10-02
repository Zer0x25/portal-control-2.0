import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { createAuthSlice } from "./slices/authSlice";
import { createToastSlice } from "./slices/toastSlice";
import { createThemeSlice } from "./slices/themeSlice";
import { createMeterReadingSlice } from "./slices/meterReadingSlice";
import { createEmployeeSlice } from "./slices/employeeSlice";
import { createDashboardSlice } from "./slices/dashboardSlice";
import { createNotificationSlice } from "./slices/notificationSlice";
import { createUxSlice } from "./slices/uxSlice";

import { AppState } from "./types";
import { createConfigSlice } from "./slices/configSlice";
import { createCorrectionRequestSlice } from "./slices/correctionRequestSlice";
import { createShiftSlice } from "./slices/shiftSlice";
import { createTimeRecordSlice } from "./slices/timeRecordSlice";
import { createSyncSlice } from "./slices/syncSlice";
import { createUserSlice } from "./slices/userSlice";
import { createAbsenceSlice } from "./slices/absenceSlice";
import { createQuickNotesSlice } from "./slices/quickNotesSlice";

import { sentryMiddleware } from "../utils/sentryMiddlewares";

export const useStore = create<AppState>()(
  sentryMiddleware(
    devtools(
      (set, get, api) => ({
        ...createAuthSlice(set, get, api),
        ...createToastSlice(set, get, api),
        ...createThemeSlice(set, get, api),
        ...createMeterReadingSlice(set, get, api),
        ...createEmployeeSlice(set, get, api),
        ...createDashboardSlice(set, get, api),
        ...createNotificationSlice(set, get, api),
        // ...createConfigSlice(set, get, api), // Check if kept (yes)
        ...createConfigSlice(set, get, api),
        ...createCorrectionRequestSlice(set, get, api),
        ...createShiftSlice(set, get, api),
        ...createTimeRecordSlice(set, get, api),
        ...createSyncSlice(set, get, api),
        ...createUserSlice(set, get, api),
        ...createAbsenceSlice(set, get, api),
        ...createQuickNotesSlice(set, get, api),
        ...createUxSlice(set, get, api),
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
    "Sesion cerrada por seguridad: demasiadas peticiones detectadas. Intente nuevamente en unos segundos.",
    "error",
    6000,
  );

  setTimeout(() => {
    useStore.getState().logout();
  }, 600);
});
