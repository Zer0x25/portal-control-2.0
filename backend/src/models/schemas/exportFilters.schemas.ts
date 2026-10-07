import { calendarDateQuery } from "./dataQuery";
import { z } from "zod";
export const ControllerExportQuerySchema = z
  .object({
    startDate: calendarDateQuery,
    endDate: calendarDateQuery,
    area: z.string().optional(),
    cargo: z.string().optional(),
    employeeId: z.string().optional(),
    viewMode: z.enum(["month", "week", "day"]).default("month"),
    mode: z.enum(["summary", "compiled_detailed"]).optional(), // New parameter
  })
  .refine((value) => value.startDate <= value.endDate, "Rango de fechas invertido");
