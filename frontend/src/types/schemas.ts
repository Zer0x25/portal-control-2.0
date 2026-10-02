import { z } from "zod";

// Base schema for all syncable entities
export const SyncableSchema = z.object({
  lastModified: z.number(),
  syncStatus: z.enum(["synced", "pending", "error"]),
  isDeleted: z.boolean(),
  syncError: z.string().optional(),
});

export const EmployeeSchema = SyncableSchema.extend({
  id: z.string(),
  name: z.string(),
  rut: z.string().nullable().optional(),
  position: z.string(),
  area: z.string(),
  workdayType: z.string(),
  status: z.enum(["Activo", "Inactivo", "Licencia", "Vacaciones", "Archivado"]),
  email: z.string().nullable().optional(),
  pin: z.string().nullable().optional(),
  pinFailedAttempts: z.number().nullable().optional(),
  isPinBlocked: z.boolean().nullable().optional(),
});

export const UserSchema = SyncableSchema.extend({
  id: z.string(),
  username: z.string(),
  password: z.string().nullable().optional(),
  role: z.enum([
    "Usuario",
    "Reloj Control",
    "Supervisor",
    "Administrador",
    "Supervisor Elevado",
    "Fiscalizador",
    "Archivado",
  ]),
  employeeId: z.string().nullable().optional(),
  mustChangePassword: z.boolean().nullable().optional(),
});

export const AppSettingSchema = SyncableSchema.extend({
  id: z.string(),
  value: z.any(),
});

// --- NEW SCHEMAS ---

const LeaveTypeSchema = z.enum([
  "Vacaciones",
  "Licencia Médica",
  "Permiso",
  "Permiso Especial",
  "Feriado",
  "Ausencia no justificada",
  "Suspension",
  "SYSTEM_ANOMALY",
]);

const JustificationSchema = z.object({
  type: LeaveTypeSchema,
  leaveId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const DailyTimeRecordSchema = SyncableSchema.extend({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  employeePosition: z.string().nullable().optional(),
  employeeArea: z.string().nullable().optional(),
  employeeWorkdayType: z.string().nullable().optional(),
  date: z.string(), // YYYY-MM-DD
  status: z.enum([
    "Laborando",
    "Colacion",
    "Completado",
    "AnomaliaManual",
    "Ausente",
    "Permiso",
    "Permiso Especial",
    "Vacaciones",
    "DiaLibre",
    "Feriado",
    "SinMarcajeTurnoAsignado",
  ]),
  entrada: z.string().nullable().optional(),
  inicioColacion: z.string().nullable().optional(),
  finColacion: z.string().nullable().optional(),
  salida: z.string().nullable().optional(),
  entradaTimestamp: z.number().nullable().optional(),
  inicioColacionTimestamp: z.number().nullable().optional(),
  finColacionTimestamp: z.number().nullable().optional(),
  salidaTimestamp: z.number().nullable().optional(),
  scheduledStartTime: z.string().nullable().optional(),
  scheduledEndTime: z.string().nullable().optional(),
  scheduledHours: z.number().nullable().optional(),
  scheduledColacionMinutes: z.number().nullable().optional(),
  shiftPatternId: z.string().nullable().optional(),
  shiftPatternName: z.string().nullable().optional(),
  justification: JustificationSchema.nullable().optional(),
  source: z
    .enum([
      "SELF_SERVICE",
      "OPERATOR",
      "KIOSK",
      "KIOSK_BACKEND",
      "WEB",
      "SYSTEM",
      "SYSTEM_AUTO",
      "SYSTEM_LEAVE",
      "SYSTEM_HOLIDAY",
      "SYSTEM_ABSENCE",
    ])
    .nullable()
    .optional(),
});

const LogbookEntryItemSchema = z.object({
  id: z.string(),
  time: z.string(),
  annotation: z.string(),
  timestamp: z.number(),
});

const SupplierEntrySchema = z.object({
  id: z.string(),
  time: z.string(),
  licensePlate: z.string(),
  driverName: z.string(),
  paxCount: z.number(),
  company: z.string(),
  reason: z.string(),
  timestamp: z.number(),
});

export const ShiftReportSchema = SyncableSchema.extend({
  id: z.string(),
  folio: z.string(),
  date: z.string(),
  shiftName: z.string(),
  responsibleUser: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  status: z.enum(["open", "closed"]),
  logEntries: z.array(LogbookEntryItemSchema),
  supplierEntries: z.array(SupplierEntrySchema),
});

export const AuditLogSchema = SyncableSchema.partial().extend({
  id: z.string(),
  timestamp: z.string(),
  actorUsername: z.string().nullable().optional(),
  action: z.string(),
  details: z.record(z.string(), z.any()).optional().nullable(),
  category: z.string().optional().nullable(),
  severity: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  targetResource: z.string().optional().nullable(),
});

const DayInCycleScheduleSchema = z.object({
  dayIndex: z.number(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isOffDay: z.boolean(),
  hasColacion: z.boolean(),
  colacionMinutes: z.number(),
  hours: z.number().optional(),
});

export const TheoreticalShiftPatternSchema = SyncableSchema.extend({
  id: z.string(),
  name: z.string(),
  cycleLengthDays: z.number(),
  startDayOfWeek: z.number().nullable().optional(),
  dailySchedules: z.array(DayInCycleScheduleSchema),
  color: z.string().nullable().optional(),
  maxHoursPattern: z.number().nullable().optional(),
  worksOnHolidays: z.boolean().nullable().optional(),
});

export const AssignedShiftSchema = SyncableSchema.extend({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string().nullable().optional(),
  shiftPatternId: z.string(),
  shiftPatternName: z.string().nullable().optional(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
});

export const QuickNoteSchema = SyncableSchema.extend({
  id: z.string(),
  content: z.string(),
  authorUsername: z.string(),
  createdAt: z.number(),
});

const ReadingEventTypeEnum = z.enum([
  "CONSUMPTION",
  "RECHARGE",
  "FULL_RECHARGE",
  "INITIAL",
  "INSTANTANEOUS",
  "ADJUSTMENT",
  "UNKNOWN",
]);

export const MeterReadingItemSchema = SyncableSchema.extend({
  id: z.string(),
  meterConfigId: z.string(),
  timestamp: z.number(),
  authorUsername: z.string(),
  value: z.number(),
  isRecharge: z.boolean(),
  normalizedValue: z.number(),
  delta: z.number(),
  eventType: ReadingEventTypeEnum,
  previousReadingId: z.string().optional(),
});

export const LeaveRecordSchema = SyncableSchema.extend({
  id: z.string(),
  employeeId: z.string(),
  type: LeaveTypeSchema,
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string().nullable().optional(),
});

export const HolidaySchema = SyncableSchema.extend({
  id: z.string(),
  date: z.string(),
  name: z.string(),
  type: z.enum(["Nacional", "Regional", "Específico"]),
});

export const CorrectionRequestSchema = SyncableSchema.extend({
  id: z.string(),
  employeeId: z.string(),
  timeRecordId: z.string(),
  recordField: z.enum(["entrada", "inicioColacion", "finColacion", "salida"]),
  originalValue: z.string().nullable().optional(),
  requestedValue: z.string().datetime({ offset: true }),
  reason: z.string(),
  attachment: z
    .object({
      filename: z.string(),
      mimeType: z.string(),
      data: z.string(),
    })
    .nullable()
    .optional(),
  status: z.enum(["pending", "approved", "rejected"]),
  resolvedBy: z.string().nullable().optional(),
  resolvedAt: z.number().nullable().optional(),
  createdAt: z.number(),
  rejectionReason: z.string().nullable().optional(),
});

export const ReportStatKpisSchema = z.object({
  tardinessCount: z.number(),
  absenceCount: z.number(),
  vacationCount: z.number(),
  medicalLeaveCount: z.number(),
  specialPermitCount: z.number(),
  overtimePercentage: z.number(),
  avgWeeklyHours: z.number(),
  tardinessRate: z.number(),
  absenceRate: z.number(),
});

export const KpiDetailsSchema = z.object({
  tardyRecords: z.array(z.any()),
  absentEmployees: z.array(z.any()),
  vacationRecords: z.array(z.any()),
  medicalLeaveRecords: z.array(z.any()),
  specialPermitRecords: z.array(z.any()),
});

export const KpiCacheItemSchema = z.object({
  id: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  filtersIdentifier: z.string(),
  kpis: ReportStatKpisSchema,
  details: KpiDetailsSchema,
  timestamp: z.number(),
});

export const CalendarCacheItemSchema = z.object({
  id: z.string(),
  date: z.string(),
  filterHash: z.string(),
  data: z.any(),
  timestamp: z.number(),
});

// ============================================================================
// SUPERVISOR SCHEMAS - Validación para Sistema de Supervisor
// ============================================================================

export const SupervisorPermissionsSchema = z.object({
  canViewAnalytics: z.boolean(),
  canViewKPIs: z.boolean(),
  canViewReports: z.boolean(),
  canViewTimeRecords: z.boolean(),
  canEditTimeRecords: z.boolean(),
  canApproveCorrections: z.boolean(),
  canBlockEmployees: z.boolean(),
  canManageShifts: z.boolean(),
  canManageUsers: z.boolean(),
  canConfigureSystem: z.boolean(),
  canAccessAuditLogs: z.boolean(),
});

export const SupervisorNotificationSettingsSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  anomalies: z.boolean(),
  overtime: z.boolean(),
  absences: z.boolean(),
  shiftChanges: z.boolean(),
});

export const SupervisorWidgetConfigSchema = z.object({
  id: z.string(),
  type: z.enum([
    "attendance_overview",
    "kpi_summary",
    "recent_activity",
    "employee_status",
    "shift_schedule",
    "alerts_notifications",
    "time_tracking",
    "performance_metrics",
  ]),
  position: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  settings: z.record(z.any()),
  enabled: z.boolean(),
});

export const SupervisorDashboardConfigSchema = z.object({
  id: z.string(),
  supervisorId: z.string(),
  theme: z.enum(["light", "dark", "auto"]),
  language: z.enum(["es", "en"]),
  timezone: z.string(),
  notifications: SupervisorNotificationSettingsSchema,
  widgets: z.array(SupervisorWidgetConfigSchema),
  layout: z.object({
    columns: z.number(),
    gap: z.number(),
    responsive: z.boolean(),
  }),
});

export const SupervisorFilterStateSchema = z.object({
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }),
  employees: z.array(z.string()),
  areas: z.array(z.string()),
  shifts: z.array(z.string()),
  status: z.array(z.enum(["present", "absent", "late", "on_break", "overtime", "off_duty"])),
  search: z.string(),
});

export const SupervisorErrorSchema = z.object({
  code: z.enum([
    "PERMISSION_DENIED",
    "VALIDATION_ERROR",
    "NETWORK_ERROR",
    "DATA_NOT_FOUND",
    "OPERATION_FAILED",
    "RATE_LIMITED",
    "SYSTEM_MAINTENANCE",
  ]),
  message: z.string(),
  details: z.record(z.any()).optional(),
  recoverable: z.boolean(),
});

export const SupervisorActionResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: SupervisorErrorSchema.optional(),
  timestamp: z.number(),
  action: z.enum([
    "view_dashboard",
    "view_analytics",
    "view_kpis",
    "view_reports",
    "edit_time_record",
    "approve_correction",
    "block_employee",
    "manage_shift",
    "manage_user",
    "configure_system",
    "access_audit",
  ]),
});

export const SupervisorReportDataSchema = z.object({
  summary: z.object({
    totalEmployees: z.number(),
    presentToday: z.number(),
    absentToday: z.number(),
    lateToday: z.number(),
    overtimeHours: z.number(),
  }),
  charts: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["line", "bar", "pie", "doughnut", "area"]),
      title: z.string(),
      data: z.any(),
      config: z.record(z.any()),
    }),
  ),
  tables: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      columns: z.array(
        z.object({
          key: z.string(),
          label: z.string(),
          type: z.enum(["string", "number", "date", "boolean", "status"]),
          sortable: z.boolean(),
        }),
      ),
      rows: z.array(z.record(z.any())),
    }),
  ),
  insights: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["info", "warning", "success", "error"]),
      title: z.string(),
      description: z.string(),
      actionable: z.boolean(),
      priority: z.enum(["low", "medium", "high", "critical"]),
    }),
  ),
});

export const SupervisorReportSchema = SyncableSchema.extend({
  id: z.string(),
  title: z.string(),
  type: z.enum([
    "attendance_summary",
    "efficiency_report",
    "overtime_analysis",
    "absence_patterns",
    "shift_compliance",
    "custom_report",
  ]),
  supervisorId: z.string(),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }),
  filters: SupervisorFilterStateSchema,
  data: SupervisorReportDataSchema,
  generatedAt: z.number(),
  expiresAt: z.number().optional(),
});

// ============================================================================
// TYPE INFERENCE - Generar tipos desde schemas
// ============================================================================

export type SupervisorPermissions = z.infer<typeof SupervisorPermissionsSchema>;
export type SupervisorNotificationSettings = z.infer<typeof SupervisorNotificationSettingsSchema>;
export type SupervisorWidgetConfig = z.infer<typeof SupervisorWidgetConfigSchema>;
export type SupervisorDashboardConfig = z.infer<typeof SupervisorDashboardConfigSchema>;
export type SupervisorFilterState = z.infer<typeof SupervisorFilterStateSchema>;
export type SupervisorError = z.infer<typeof SupervisorErrorSchema>;
export type SupervisorActionResult<T = unknown> = z.infer<typeof SupervisorActionResultSchema> & {
  data?: T;
};
export type SupervisorReportData = z.infer<typeof SupervisorReportDataSchema>;
export type SupervisorReport = z.infer<typeof SupervisorReportSchema>;
