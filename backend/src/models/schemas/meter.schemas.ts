import { numericString, syncAuditFields, yearMonthSchema, z } from "./common";
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

export const MeterReadingQuerySchema = z.object({
  page: numericString.optional(),
  pageSize: numericString.optional(),
  since: numericString.optional(),
  month: yearMonthSchema().optional(),
});
