import { z } from "zod";
export const ControllerExportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  area: z.string().optional(),
  cargo: z.string().optional(),
  employeeId: z.string().optional(),
  viewMode: z.enum(["month", "week", "day"]).default("month"),
  mode: z.enum(["summary", "compiled_detailed"]).optional(), // New parameter
});
