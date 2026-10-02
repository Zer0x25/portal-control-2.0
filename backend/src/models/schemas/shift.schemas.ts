import { isoDateSchema, numericString, syncAuditFields, z } from "./common";

export const PatternScheduleSchema = z
  .object({
    dayIndex: z.number().int().min(0).max(6),
    startTime: z.string().nullable().optional(),
    endTime: z.string().nullable().optional(),
    isOffDay: z.boolean(),
    hasColacion: z.boolean().optional(),
    colacionMinutes: z.number().optional(),
    hours: z.number().optional(),
  })
  .openapi("PatternSchedule");

export const ShiftPatternSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(2),
    cycleLengthDays: z.number().int().min(1),
    startDayOfWeek: z.number().int().min(0).max(6),
    dailySchedules: z.union([z.string(), z.array(PatternScheduleSchema)]),
    color: z.string(),
    maxHoursPattern: z.number(),
    worksOnHolidays: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    lastModified: z.number().optional(),
  })
  .openapi("ShiftPattern");

export const BulkShiftPatternSchema = z.array(ShiftPatternSchema).openapi("BulkShiftPattern");

export const AssignedShiftSchema = z
  .object({
    id: z.string().optional(),
    employeeId: z.string(),
    shiftPatternId: z.string(),
    startDate: isoDateSchema(),
    endDate: isoDateSchema().nullable().optional(),
    isDeleted: syncAuditFields.isDeleted,
    lastModified: syncAuditFields.lastModified,
  })
  .openapi("AssignedShift");

export const BulkAssignedShiftSchema = z.array(AssignedShiftSchema).openapi("BulkAssignedShift");

export const ScheduleInfoSchema = z
  .object({
    scheduleText: z.string(),
    isWorkDay: z.boolean(),
    isHoliday: z.boolean().optional(),
    holidayName: z.string().optional(),
    justificationType: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    hours: z.number().optional(),
    shiftPatternId: z.string().optional(),
    shiftPatternName: z.string().optional(),
    patternColor: z.string().optional(),
    hasColacion: z.boolean().optional(),
    colacionMinutes: z.number().optional(),
    planningStatus: z.string().optional(),
  })
  .openapi("ScheduleInfo");

export const MonthlyScheduleViewSchema = z
  .object({
    dateIso: z.string(),
    dayOfWeek: z.string(),
    dayOfMonth: z.number(),
    scheduleText: z.string(),
    isWorkDay: z.boolean(),
  })
  .openapi("MonthlyScheduleView");

export const SuggestedPatternNameSchema = z
  .object({
    suggestedName: z.string(),
  })
  .openapi("SuggestedPatternName");

export const ShiftQuerySchema = z.object({
  page: numericString.optional(),
  pageSize: numericString.optional(),
  employeeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const CalendarMatrixRequestSchema = z
  .object({
    startDate: isoDateSchema(),
    endDate: isoDateSchema(),
    employeeIds: z.array(z.string()),
  })
  .openapi("CalendarMatrixRequest");

export const MonthlyPlanDaySchema = z.object({
  day: z.number().int().min(1).max(31),
  type: z.enum(["work", "rest"]),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  hours: z.number().optional(),
});

export const MonthlyPlanRequestSchema = z
  .object({
    employeeId: z.string().min(1),
    month: z.string().min(1),
    year: z.string().min(4),
    patternName: z.string().optional(),
    dailySchedules: z.array(MonthlyPlanDaySchema),
  })
  .openapi("MonthlyPlanRequest");

export const ConflictValidationSchema = z
  .object({
    employeeId: z.string().min(1),
    startDate: isoDateSchema(),
    endDate: isoDateSchema(),
    excludeAssignmentId: z.string().optional(),
  })
  .openapi("ConflictValidation");
