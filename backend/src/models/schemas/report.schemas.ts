import { isoDateSchema, z } from "./common";
import { ApiResponseSchema } from "./responses.schemas";

export const ScheduledReportSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    type: z.enum(["daily", "weekly", "monthly"]),
    active: z.boolean(),
    recipients: z.array(z.string().email()),
    lastRun: z.string().nullable().optional(),
    nextRun: z.string().nullable().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .openapi("ScheduledReport");

export const ScheduledReportListResponseSchema = ApiResponseSchema.extend({
  data: z.array(ScheduledReportSchema),
}).openapi("ScheduledReportListResponse");

export const ShiftReportSchema = z
  .object({
    id: z.string().optional(),
    date: isoDateSchema(),
    folio: z.string().min(1),
    shiftName: z.string().min(1),
    responsibleUser: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().nullable().optional(),
    status: z.enum(["open", "closed"]),
    logEntries: z.array(
      z.object({
        id: z.string().min(1),
        time: z.string().min(1),
        annotation: z.string().min(1),
        timestamp: z.number(),
      }),
    ),
    supplierEntries: z.array(
      z.object({
        id: z.string().min(1),
        time: z.string().min(1),
        licensePlate: z.string().min(1),
        driverName: z.string().min(1),
        paxCount: z.number(),
        company: z.string().min(1),
        reason: z.string().min(1),
        timestamp: z.number(),
      }),
    ),
  })
  .openapi("ShiftReport");

export const ShiftReportListResponseSchema = ApiResponseSchema.extend({
  data: z.array(ShiftReportSchema),
}).openapi("ShiftReportListResponse");
