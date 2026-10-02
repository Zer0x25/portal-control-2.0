import { isoDateSchema, numericString, syncAuditFields, z } from "./common";

export const HolidaySchema = z
  .object({
    id: z.string().optional(),
    date: isoDateSchema(),
    name: z.string().min(2),
    type: z.enum(["Civil", "Religioso"]),
    isRenounceable: z.boolean().optional(),
    syncStatus: syncAuditFields.syncStatus,
    isDeleted: syncAuditFields.isDeleted,
  })
  .openapi("Holiday");

export const BulkHolidaySchema = z.array(HolidaySchema).openapi("BulkHoliday");

export const HolidayQuerySchema = z.object({
  since: numericString.optional(),
});
