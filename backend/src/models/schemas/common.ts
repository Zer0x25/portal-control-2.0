import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_MONTH_REGEX = /^\d{4}-\d{2}$/;

export const isoDateSchema = (message = "Formato de fecha inválido (YYYY-MM-DD)") =>
  z.string().regex(ISO_DATE_REGEX, message);

export const businessDateRangeSchema = z
  .object({
    startDate: isoDateSchema(),
    endDateExclusive: isoDateSchema(),
  })
  .refine((v) => v.startDate < v.endDateExclusive, {
    message: "startDate debe ser anterior a endDateExclusive",
    path: ["endDateExclusive"],
  });

export const yearMonthSchema = (message = "Formato YYYY-MM") =>
  z.string().regex(YEAR_MONTH_REGEX, message);

export const syncAuditFields = {
  isDeleted: z.boolean().optional(),
  syncStatus: z.string().optional(),
  lastModified: z.number().optional(),
};

export const userRoleEnum = z.enum([
  "Usuario",
  "Reloj_Control",
  "Supervisor",
  "Administrador",
  "Supervisor_Elevado",
  "Fiscalizador",
]);

export const employeeStatusEnum = z.enum(["Activo", "Archivado"]);

export const numericString = z.string().transform((val) => Number(val));

export { z };
