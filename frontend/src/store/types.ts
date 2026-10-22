import { AuthSlice } from "./slices/authSlice";
import { ToastSlice } from "./slices/toastSlice";
import { ThemeSlice } from "./slices/themeSlice";
import { UxSlice } from "./slices/uxSlice";
import { SyncSlice } from "./slices/syncSlice";
import { QuickNotesSlice } from "./slices/quickNotesSlice";
import { SystemSlice } from "./slices/systemSlice";

export type AppState = AuthSlice &
  ToastSlice &
  ThemeSlice &
  SyncSlice &
  QuickNotesSlice &
  UxSlice &
  SystemSlice;
