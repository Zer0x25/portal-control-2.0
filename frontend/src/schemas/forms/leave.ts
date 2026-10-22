import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
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

/**
 * Contexto que la validacion de la **ausencia** necesita del exterior.
 *
 * Son reglas de negocio, no de contrato: el backend no conoce el historico
 * de ausencias del empleado ni el limite de antiguedad de la pantalla.
 */
export interface LeaveValidationContext {
  /** Ausencias ya registradas (para detectar solapamientos). */
  readonly existingLeaves: readonly {
    readonly id?: string;
    readonly employeeId: string;
    readonly startDate: string;
    readonly endDate: string;
  }[];
  /** Id de la ausencia que se esta editando (no se solapa consigo misma). */
  readonly editingLeaveId?: string;
  /** Fecha limite de antiguedad (`YYYY-MM-DD`). */
  readonly oldestAllowedStartDate: string;
  /** Fecha de hoy del negocio (`YYYY-MM-DD`). */
  readonly today: string;
}

/**
 * Schema de la ausencia **con las reglas que dependen del contexto**.
 *
 * - la fecha de termino no puede ser anterior a la de inicio;
 * - no se pueden registrar ausencias con mas de 7 dias de antiguedad;
 * - al editar, la fecha de termino no puede ser anterior a hoy;
 * - el empleado no puede tener dos ausencias solapadas.
 */
export const buildLeaveFormSchema = (context: LeaveValidationContext) =>
  leaveFormSchema.superRefine((values, ctx) => {
    if (values.startDate > values.endDate) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.invalidDateRange(),
        path: ["endDate"],
      });
    }

    if (!context.editingLeaveId && values.startDate < context.oldestAllowedStartDate) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.tooOldRecord(),
        path: ["startDate"],
      });
    }

    if (context.editingLeaveId && values.endDate < context.today) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.endDateInPast(),
        path: ["endDate"],
      });
    }

    const overlaps = context.existingLeaves.some(
      (leave) =>
        leave.id !== context.editingLeaveId &&
        leave.employeeId === values.employeeId &&
        !(values.endDate < leave.startDate || values.startDate > leave.endDate),
    );

    if (overlaps) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.overlappingLeave(),
        path: ["startDate"],
      });
    }
  });
