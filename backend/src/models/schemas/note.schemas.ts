import { numericString, syncAuditFields, z } from "./common";
import { ApiResponseSchema } from "./responses.schemas";

export const QuickNoteSchema = z
  .object({
    id: z.string().optional(),
    content: z.string().min(1),
    authorUsername: z.string(),
    isArchived: z.boolean().optional(),
    color: z.string().optional(),
    reminderEnabled: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    ...syncAuditFields,
  })
  .openapi("QuickNote");

export const QuickNoteResponseSchema = ApiResponseSchema.extend({
  data: QuickNoteSchema,
}).openapi("QuickNoteResponse");

export const QuickNoteListResponseSchema = ApiResponseSchema.extend({
  data: z.array(QuickNoteSchema),
}).openapi("QuickNoteListResponse");

export const QuickNoteQuerySchema = z.object({
  since: numericString.optional(),
});
