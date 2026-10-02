import { AuthSlice } from "./slices/authSlice";
import { ToastSlice } from "./slices/toastSlice";
import { ThemeSlice } from "./slices/themeSlice";
import { MeterReadingSlice } from "./slices/meterReadingSlice";
import { EmployeeSlice } from "./slices/employeeSlice";
import { DashboardSlice } from "./slices/dashboardSlice";
import { NotificationSlice } from "./slices/notificationSlice";
import { ConfigSlice } from "./slices/configSlice";
import { CorrectionRequestSlice } from "./slices/correctionRequestSlice";
import { ShiftSlice } from "./slices/shiftSlice";
import { UxSlice } from "./slices/uxSlice";
import { TimeRecordSlice } from "./slices/timeRecordSlice";
import { SyncSlice } from "./slices/syncSlice";
import { UserSlice } from "./slices/userSlice";
import { AbsenceSlice } from "./slices/absenceSlice";
import { QuickNotesSlice } from "./slices/quickNotesSlice";

export type AppState = AuthSlice &
  ToastSlice &
  ThemeSlice &
  MeterReadingSlice &
  EmployeeSlice &
  DashboardSlice &
  NotificationSlice &
  ConfigSlice &
  CorrectionRequestSlice &
  ShiftSlice &
  TimeRecordSlice &
  SyncSlice &
  UserSlice &
  AbsenceSlice &
  QuickNotesSlice &
  UxSlice;
