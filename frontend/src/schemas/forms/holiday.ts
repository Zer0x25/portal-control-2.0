import { z } from "zod";

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
