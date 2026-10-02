import { isoDateSchema, numericString, syncAuditFields, z } from "./common";
import { ApiResponseSchema } from "./responses.schemas";

export const LeaveRecordSchema = z
  .object({
    id: z.string().optional(),
    employeeId: z.string(),
    type: z.string(),
    startDate: isoDateSchema(),
    endDate: isoDateSchema(),
    notes: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    ...syncAuditFields,
  })
  .openapi("LeaveRecord");

export const LeaveResponseSchema = ApiResponseSchema.extend({
  data: LeaveRecordSchema,
}).openapi("LeaveResponse");

export const LeaveListResponseSchema = ApiResponseSchema.extend({
  data: z.array(LeaveRecordSchema),
}).openapi("LeaveListResponse");

export const PaginatedLeaveResponseSchema = ApiResponseSchema.extend({
  data: z.array(LeaveRecordSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
}).openapi("PaginatedLeaveResponse");

export const LeaveQuerySchema = z.object({
  page: numericString.optional(),
  pageSize: numericString.optional(),
  since: numericString.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  employeeId: z.string().optional(),
  showArchived: z.string().optional(),
});
