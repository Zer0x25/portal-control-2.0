import { AuthSlice } from "./slices/authSlice";
import { ToastSlice } from "./slices/toastSlice";
import { ThemeSlice } from "./slices/themeSlice";
import { MeterReadingSlice } from "./slices/meterReadingSlice";
import { EmployeeSlice } from "./slices/employeeSlice";
import { DashboardSlice } from "./slices/dashboardSlice";
import { NotificationSlice } from "./slices/notificationSlice";
import { CorrectionRequestSlice } from "./slices/correctionRequestSlice";
import { UxSlice } from "./slices/uxSlice";
import { SyncSlice } from "./slices/syncSlice";
import { UserSlice } from "./slices/userSlice";
import { QuickNotesSlice } from "./slices/quickNotesSlice";
import { SystemSlice } from "./slices/systemSlice";

export type AppState = AuthSlice &
  ToastSlice &
  ThemeSlice &
  MeterReadingSlice &
  EmployeeSlice &
  DashboardSlice &
  NotificationSlice &
  CorrectionRequestSlice &
  SyncSlice &
  UserSlice &
  QuickNotesSlice &
  UxSlice &
  SystemSlice;
