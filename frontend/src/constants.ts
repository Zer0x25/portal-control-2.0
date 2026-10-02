export const ROUTES = {
  LOGIN: "/",
  DASHBOARD: "/dashboard", // The default user dashboard
  SUPERVISOR_DASHBOARD: "/dashboard-supervisor", // The dashboard for supervisors
  TIME_CONTROL: "/time-control",
  LOGBOOK: "/logbook",
  METER_READINGS: "/meter-readings", // New route for meter readings
  CONFIGURATION: "/configuration",
  USER_MANAGEMENT: "/user-management",
  EMPLOYEE_MANAGEMENT: "/employee-management", // New route for employee management
  PERSONNEL_MANAGEMENT: "/personnel-management",
  THEORETICAL_SHIFTS: "/theoretical-shifts",
  SHIFT_CALENDAR: "/shift-calendar", // New route for the dedicated calendar page
  // [x] Fase 6: Rediseño Estético Supervisión (Móvil)
  //   - [x] Mejorar Header y Navegación de Pestañas
  //   - [x] Modernizar KpiCard y LiveStatusPanel
  //   - [x] Optimizar KpiFilterPanel para Móviles
  //   - [x] Rediseñar Tarjetas de Reporte Móvil
  //   - [/] Refinar LoadingOverlay (Móvil)
  //   - [x] Verificación de UX y Temas (Light/Dark)
  COMMUNICATIONS: "/communications", // New route for internal communications
  EMAIL_CENTER: "/email-center", // New route for the Email Center
  WORKER_PORTAL: "/worker-portal",
  KIOSK: "/kiosk", // New route for Kiosk Mode
  AUDIT_LOGS: "/audit-logs", // New route for Audit Logs page
  MASTER_DATA_EXPORT: "/master-data-data-export", // New route for master data export
  MONTHLY_PLANNING: "/planning/monthly", // New route for Monthly Shift Assistant wizard
  GOVERNANCE_HUB: "/admin/governance", // Unified Governance & Security Center
  ADMIN_TOOLS: "/admin/tools", // Redirected to Governance Hub
  INTEGRITY_DASHBOARD: "/admin/integrity", // Redirected to Governance Hub
};

export const APP_TITLE = "Portal Control Interno";

// LocalStorage and SessionStorage Keys
export const STORAGE_KEYS = {
  // LocalStorage
  THEME: "app-theme",
  SOUND_ENABLED: "app-sound-enabled",
  DEV_MODE: "devModeEnabled",
  TIME_CONTROL_CLOCK_FORMAT: "timecontrol-clockformat",
  LAST_SYNC_TIMESTAMP: "lastSyncTime", // Aligned with implementation
  LAST_LOGGED_USER_ID: "lastLoggedUserId",
  LAST_QUICK_NOTES_VIEW_TIMESTAMP: "lastQuickNotesViewTimestamp",
  LAST_COMMUNICATIONS_VIEW_TIMESTAMP: "lastCommunicationsViewTimestamp",

  // SessionStorage
  CURRENT_USER: "currentUser",
  AUTO_LOGIN_ACTIONS_DONE: "autoLoginActionsDone",
  TRIGGER_AUTO_CLOSE_SHIFT: "triggerAutoCloseShift",
  SHIFT_HANDOVER_VIEWED: "shiftHandoverViewed",
  FULL_SHIFT_CLEANUP_DONE: "fullShiftCleanupDone", // New key for one-time full scan
};

// Time related constants
export const AUTO_CLOSE_SHIFT_HOURS = 14;
export const AUTO_CLOSE_SHIFT_MS = AUTO_CLOSE_SHIFT_HOURS * 60 * 60 * 1000;
