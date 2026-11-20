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

export const MAX_PAGE_SIZE = 200;

export const positiveIntString = z
  .string()
  .regex(/^[1-9]\d*$/, "Debe ser un número entero positivo mayor o igual a 1")
  .transform((val) => Number(val));

export const pageSizeString = positiveIntString.refine((val) => val <= MAX_PAGE_SIZE, {
  message: `pageSize no puede exceder ${MAX_PAGE_SIZE}`,
});

export { z };
