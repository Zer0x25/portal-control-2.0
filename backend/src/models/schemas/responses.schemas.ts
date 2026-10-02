import { z } from "./common";

export const ApiResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string().optional(),
  })
  .openapi("ApiResponse");

export const PaginatedResponseSchema = ApiResponseSchema.extend({
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    totalPages: z.number(),
  }),
});
