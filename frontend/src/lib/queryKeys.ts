/**
 * Tabla canónica de raíces y constructores de claves de consulta (Spec 034 / AC8 / T20).
 * Única fuente de verdad para query keys en toda la aplicación.
 * Toda raíz debe estar registrada en PERSISTED_QUERY_ROOTS o SENSITIVE_QUERY_ROOTS.
 */

export const QUERY_KEYS = {
  assignedShifts: {
    all: ["assignedShifts"] as const,
    list: (filters?: unknown) => ["assignedShifts", filters] as const,
    infinite: (filters?: unknown) => ["assignedShifts", filters] as const,
  },
  attendanceAnalytics: {
    all: ["attendanceAnalytics"] as const,
    range: (startDate?: string, endDate?: string) =>
      ["attendanceAnalytics", startDate, endDate] as const,
  },
  auditLogs: {
    all: ["auditLogs"] as const,
    list: (params?: unknown) => ["auditLogs", params] as const,
    infinite: (params?: unknown) => ["auditLogs", params] as const,
    proactiveDetections: () => ["auditLogs", "proactive-detections"] as const,
  },
  calendarMatrix: {
    all: ["calendarMatrix"] as const,
    matrix: (startDate?: string, endDate?: string, employeeIds?: string[]) =>
      ["calendarMatrix", startDate, endDate, employeeIds] as const,
  },
  config: {
    all: ["config"] as const,
    key: (key: string) => ["config", key] as const,
    public: (key: string) => ["config", "public", key] as const,
  },
  correctionRequests: {
    all: ["correctionRequests"] as const,
    list: (params?: unknown) => ["correctionRequests", params] as const,
    stats: () => ["correctionRequests", "stats"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    overview: () => ["dashboard", "overview"] as const,
    dailyPlanning: () => ["dashboard", "dailyPlanning"] as const,
    recentActivity: () => ["dashboard", "recentActivity"] as const,
  },
  employees: {
    all: ["employees"] as const,
    kiosk: () => ["employees", "kiosk"] as const,
  },
  health: {
    all: ["health"] as const,
  },
  holidays: {
    all: ["holidays"] as const,
    list: (since?: number) => ["holidays", since] as const,
    infinite: (params?: unknown) => ["holidays", "infinite", params] as const,
  },
  integrityStatus: {
    all: ["integrityStatus"] as const,
  },
  kpis: {
    all: ["kpis"] as const,
    summary: (filters?: unknown) => ["kpis", "summary", filters] as const,
  },
  leaves: {
    all: ["leaves"] as const,
    list: (filters?: unknown) => ["leaves", filters] as const,
    infinite: (filters?: unknown) => ["leaves", filters] as const,
  },
  meterReadings: {
    all: ["meterReadings"] as const,
    infinite: (filters?: unknown) => ["meterReadings", "infinite", filters] as const,
  },
  notes: {
    all: ["notes"] as const,
  },
  recordHistory: {
    all: ["recordHistory"] as const,
    byRecord: (recordId: string) => ["recordHistory", recordId] as const,
  },
  shiftPatterns: {
    all: ["shiftPatterns"] as const,
    infinite: (params?: unknown) => ["shiftPatterns", "infinite", params] as const,
  },
  shiftReports: {
    all: ["shiftReports"] as const,
    list: (params?: unknown) => ["shiftReports", params] as const,
    infinite: (params?: unknown) => ["shiftReports", params] as const,
  },
  system: {
    all: ["system"] as const,
    health: () => ["system", "health"] as const,
  },
  timeRecords: {
    all: ["timeRecords"] as const,
    list: (params?: unknown) => ["timeRecords", params] as const,
    last: (employeeId?: string) => ["timeRecords", "last", employeeId] as const,
  },
  users: {
    all: ["users"] as const,
  },
} as const;

export type QueryKeyRoots = keyof typeof QUERY_KEYS;
