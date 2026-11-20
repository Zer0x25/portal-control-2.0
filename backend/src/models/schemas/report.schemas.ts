import { isoDateSchema, z } from "./common";
import { ApiResponseSchema } from "./responses.schemas";

import { calendarDateQuery, epochQuery, positiveQueryInteger } from "./dataQuery";
import { hasReportTarget } from "../../utils/reportTarget";
import { validReportCron } from "../../utils/reportCron";

export const ScheduledReportFiltersSchema = z
  .object({
    startDate: calendarDateQuery.optional(),
    endDate: calendarDateQuery.optional(),
    area: z.string().optional(),
    employeeId: z.string().optional(),
    viewMode: z.enum(["month", "week", "day"]).optional(),
    cargo: z.string().optional(),
    mode: z.enum(["summary", "compiled_detailed"]).optional(),
    shiftReportId: z.string().optional(),
  })
  .strict()
  .refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, {
    message: "Rango de fechas invertido",
  });
const reportFields = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().optional(),
    reportType: z.enum([
      "attendance_summary",
      "overtime",
      "anomalies",
      "shift_coverage",
      "calendar",
      "detailed",
      "shift_report",
    ]),
    frequency: z.enum(["daily", "weekly", "monthly"]),
    cronExpression: z
      .string()
      .trim()
      .max(256)
      .refine(validReportCron, "Cron inválido (cinco campos, horario de Chile)"),
    recipients: z.array(z.string().trim().email()).min(1),
    filters: ScheduledReportFiltersSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export const ScheduledReportInputSchema = reportFields
  .extend({
    isActive: z.boolean().default(true),
  })
  .refine((value) => hasReportTarget(value.reportType, value.filters), {
    message: "El reporte de turno requiere shiftReportId",
    path: ["filters"],
  })
  .openapi("ScheduledReportInput");
export const ScheduledReportUpdateSchema = reportFields.partial().openapi("ScheduledReportUpdate");
export const ScheduledReportSchema = reportFields
  .extend({
    id: z.string(),
    description: z.string().nullable(),
    filters: ScheduledReportFiltersSchema.nullable(),
    isActive: z.boolean(),
    lastRunAt: z.string().nullable(),
    nextRunAt: z.string().nullable(),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("ScheduledReport");
export const ScheduledReportListResponseSchema = z
  .array(ScheduledReportSchema)
  .openapi("ScheduledReportListResponse");

export const ShiftReportSchema = z
  .object({
    id: z.string().optional(),
    date: isoDateSchema(),
    folio: z.string().min(1).optional(),
    shiftName: z.string().min(1),
    responsibleUser: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().nullable().optional(),
    status: z.enum(["open", "closed"]),
    removedLogEntryIds: z.array(z.string().min(1)).max(100).optional(),
    logEntries: z.array(
      z.object({
        id: z.string().min(1),
        time: z.string().min(1),
        annotation: z.string().min(1),
        timestamp: z.number(),
        recordId: z.string().min(1).optional(),
      }),
    ),
    supplierEntries: z.array(
      z
        .object({
          id: z.string().min(1),
          time: z.string().min(1),
          entryType: z.enum(["visit", "provider"]).optional(),
          arrivalMode: z.enum(["pedestrian", "vehicle"]).optional(),
          licensePlate: z
            .string()
            .describe(
              "Requerida para vehículos y entradas sin arrivalMode; puede ser vacía cuando arrivalMode es pedestrian.",
            ),
          driverName: z.string().min(1),
          paxCount: z.number(),
          company: z.string().min(1),
          reason: z.string().min(1),
          timestamp: z.number(),
        })
        .superRefine((entry, context) => {
          if (entry.arrivalMode !== "pedestrian" && entry.licensePlate.trim().length === 0) {
            context.addIssue({
              code: "custom",
              path: ["licensePlate"],
              message: "Too small: expected string to have >=1 characters",
            });
          }
        }),
    ),
  })
  .openapi("ShiftReport");

export const ShiftReportListResponseSchema = ApiResponseSchema.extend({
  data: z.array(ShiftReportSchema),
}).openapi("ShiftReportListResponse");

export const ShiftReportQuerySchema = z.object({
  page: positiveQueryInteger(1000000).optional(),
  pageSize: positiveQueryInteger(100).optional(),
  since: epochQuery.optional(),
  status: z.enum(["open", "closed"]).optional(),
  search: z.string().trim().optional(),
  date: calendarDateQuery.optional(),
});

export const ShiftReportPaginatedResponseSchema = z
  .object({
    data: z.array(ShiftReportSchema),
    total: z.number(),
    page: z.number(),
    totalPages: z.number(),
  })
  .openapi("ShiftReportPaginatedResponse");
