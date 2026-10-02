import { numericString, z } from "./common";
import { AuditLogSchema } from "./core.schemas";
import { PaginatedResponseSchema } from "./responses.schemas";

export const AuditLogListResponseSchema = PaginatedResponseSchema.extend({
  data: z.array(AuditLogSchema),
}).openapi("AuditLogListResponse");

export const AuditLogQuerySchema = z.object({
  page: numericString.optional(),
  pageSize: numericString.optional(),
  since: numericString.optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  actor: z.string().optional(),
  action: z.string().optional(),
  severity: z.union([z.string(), z.array(z.string())]).optional(),
  outcome: z.union([z.string(), z.array(z.string())]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  recordId: z.string().optional(),
  cursor: z.string().optional(),
});

/**
 * `POST /api/audit-logs/cleanup` retention window.
 *
 * `months` drives a destructive DELETE, so it must be a bounded integer
 * instead of any value that `Number()` accepts (including negatives, NaN and
 * non-numeric strings).
 */
export const AuditLogCleanupSchema = z
  .object({
    months: z.coerce
      .number()
      .int("months debe ser un número entero")
      .min(1, "months debe ser al menos 1")
      .max(120, "months no puede superar 120")
      .default(6),
  })
  .openapi("AuditLogCleanup");
