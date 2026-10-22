import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import { businessDate, requiredTextMin } from "./common";

/**
 * Spec 036 T5 (AC2): alta de feriado (`HolidayManager.tsx`).
 *
 * Contrato: `Holiday` (`backend/src/models/schemas/holiday.schemas.ts`):
 * `date` en `YYYY-MM-DD`, `name` de 2+ caracteres y `type` de la lista cerrada.
 */
export const holidayFormSchema = z.object({
  date: businessDate("La fecha"),
  name: requiredTextMin("El nombre", 2),
  type: z.enum(["Nacional", "Regional", "Específico"]),
  isRenounceable: z.boolean().optional(),
});

/** Tipo de la entrada del formulario de feriado. */
export type HolidayFormValues = z.input<typeof holidayFormSchema>;

/**
 * Contexto que la validacion del **feriado** necesita del exterior.
 *
 * El backend no comprueba que no haya dos feriados el mismo dia: lo decide la
 * pantalla, que conoce los feriados ya guardados.
 */
export interface HolidayValidationContext {
  /** Fechas ya ocupadas por otros feriados (`YYYY-MM-DD`). */
  readonly existingDates: readonly string[];
}

/**
 * Schema del feriado **con las reglas que dependen del contexto**: no puede
 * haber dos feriados en la misma fecha.
 */
export const buildHolidayFormSchema = (context: HolidayValidationContext) =>
  holidayFormSchema.superRefine((values, ctx) => {
    if (context.existingDates.includes(values.date)) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.duplicateHolidayDate(),
        path: ["date"],
      });
    }
  });
