import { z } from "zod";

import { businessDate, optionalNullableText, requiredText } from "./common";

/**
 * Spec 036 T5 (AC2): alta de ausencia (`LeaveManager.tsx`).
 *
 * Contrato: `LeaveRecord` (`backend/src/models/schemas/leave.schemas.ts`).
 *
 * `employeeId`, `type`, `startDate` y `endDate` los exige el backend; `notes`
 * es opcional y admite `null`.
 */
export const leaveFormSchema = z.object({
  employeeId: requiredText("El empleado"),
  type: requiredText("El tipo de ausencia"),
  startDate: businessDate("La fecha de inicio"),
  endDate: businessDate("La fecha de término"),
  notes: optionalNullableText(),
});

/** Tipo de la entrada del formulario de ausencia. */
export type LeaveFormValues = z.input<typeof leaveFormSchema>;
