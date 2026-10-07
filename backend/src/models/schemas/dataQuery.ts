import { z } from "./common";

export const epochQuery = z
  .string()
  .regex(/^\d+$/)
  .refine(
    (v) => Number.isSafeInteger(Number(v)) && Number(v) <= 8640000000000000,
    "Timestamp inválido",
  )
  .transform(Number);
export const calendarDateQuery = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const date = new Date(`${v}T12:00:00Z`);
    return (
      Number(v.slice(0, 4)) >= 1 &&
      Number(v.slice(0, 4)) <= 9998 &&
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === v
    );
  }, "Fecha inexistente");
export const positiveQueryInteger = (max: number) =>
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .refine((v) => Number.isSafeInteger(Number(v)) && Number(v) <= max, "Fuera de rango")
    .transform(Number);
