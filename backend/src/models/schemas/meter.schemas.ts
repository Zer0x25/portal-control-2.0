import { epochQuery, calendarDateQuery, positiveQueryInteger } from "./dataQuery";
import { syncAuditFields, z } from "./common";
import { ApiResponseSchema, PaginatedResponseSchema } from "./responses.schemas";

export const MeterReadingSchema = z
  .object({
    id: z.string().optional(),
    meterConfigId: z.string(),
    authorUsername: z.string(),
    value: z.number(),
    timestamp: z.string().optional(),
    isRecharge: z.boolean().optional(),
    notes: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    ...syncAuditFields,
  })
  .openapi("MeterReading");

export const BulkMeterReadingSchema = z.array(MeterReadingSchema).openapi("BulkMeterReading");

export const MeterReadingResponseSchema = ApiResponseSchema.extend({
  data: MeterReadingSchema,
}).openapi("MeterReadingResponse");

export const MeterReadingListResponseSchema = ApiResponseSchema.extend({
  data: z.array(MeterReadingSchema),
}).openapi("MeterReadingListResponse");

export const PaginatedMeterReadingResponseSchema = PaginatedResponseSchema.extend({
  data: z.array(MeterReadingSchema),
}).openapi("PaginatedMeterReadingResponse");

export const MeterReadingQuerySchema = z
  .object({
    page: positiveQueryInteger(1000000).optional(),
    pageSize: positiveQueryInteger(500).optional(),
    since: epochQuery.optional(),
    meterId: z.string().min(1).optional(),
    startDate: calendarDateQuery.optional(),
    endDate: calendarDateQuery.optional(),
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .refine((v) => Number(v.slice(0, 4)) >= 1 && Number(v.slice(0, 4)) <= 9998)
      .optional(),
  })
  .refine(
    (v) => (v.page === undefined) === (v.pageSize === undefined),
    "page y pageSize deben enviarse juntos",
  )
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, "Rango invertido")
  .refine((v) => !v.month || (!v.startDate && !v.endDate), "month no admite startDate/endDate");
