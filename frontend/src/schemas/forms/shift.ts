import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import {
  businessDate,
  optionalBusinessDate,
  optionalNullableText,
  requiredText,
  requiredTextMin,
} from "./common";

/**
 * Dia del ciclo de un patron (`PatternSchedule` del backend).
 *
 * `dayIndex` va de 0 a 6, `isOffDay` es obligatorio y el resto admite `null`
 * (un dia de descanso no tiene hora de entrada).
 */
export const patternScheduleSchema = z.object({
  dayIndex: z
    .number({ error: ERROR_MESSAGES.required("El dia del ciclo") })
    .int(ERROR_MESSAGES.invalidNumber())
    .min(0, ERROR_MESSAGES.minLength("El dia del ciclo", 0))
    .max(6, ERROR_MESSAGES.maxLength("El dia del ciclo", 6)),
  startTime: optionalNullableText(),
  endTime: optionalNullableText(),
  isOffDay: z.boolean(),
  hasColacion: z.boolean().optional(),
  colacionMinutes: z.number().optional(),
  hours: z.number().optional(),
});

/**
 * Spec 036 T5 (AC2): patron de turno (`useShiftPatternForm.ts`).
 *
 * Contrato: `ShiftPattern` (`backend/src/models/schemas/shift.schemas.ts`).
 *
 * `dailySchedules` viaja como **array** de `PatternSchedule`: el backend
 * admite tambien un string (serializado), pero el formulario siempre envia la
 * estructura, que es la unica que el backend puede validar.
 */
export const shiftPatternFormSchema = z.object({
  name: requiredTextMin("El nombre", 2),
  cycleLengthDays: z
    .number({ error: ERROR_MESSAGES.required("El largo del ciclo") })
    .int(ERROR_MESSAGES.invalidNumber())
    .min(1, ERROR_MESSAGES.minLength("El largo del ciclo", 1)),
  startDayOfWeek: z
    .number({ error: ERROR_MESSAGES.required("El dia de inicio") })
    .int(ERROR_MESSAGES.invalidNumber())
    .min(0, ERROR_MESSAGES.minLength("El dia de inicio", 0))
    .max(6, ERROR_MESSAGES.maxLength("El dia de inicio", 6)),
  dailySchedules: z.array(patternScheduleSchema),
  color: requiredText("El color"),
  maxHoursPattern: z.number({ error: ERROR_MESSAGES.required("El maximo de horas") }),
  worksOnHolidays: z.boolean().optional(),
});

/**
 * Asignacion de turno a un empleado (`useShiftAssignmentForm.ts`).
 *
 * Contrato: `AssignedShift` (`backend/src/models/schemas/shift.schemas.ts`).
 */
export const shiftAssignmentFormSchema = z.object({
  employeeId: requiredText("El empleado"),
  shiftPatternId: requiredText("El patron de turno"),
  startDate: businessDate("La fecha de inicio"),
  endDate: optionalBusinessDate().nullable(),
});

/** Tipo de la entrada del formulario de patron de turno. */
export type ShiftPatternFormValues = z.input<typeof shiftPatternFormSchema>;

/** Tipo de la entrada del formulario de asignacion de turno. */
export type ShiftAssignmentFormValues = z.input<typeof shiftAssignmentFormSchema>;
