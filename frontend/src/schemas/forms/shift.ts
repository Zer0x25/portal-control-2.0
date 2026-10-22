import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import { calculateHoursBetween } from "../../utils/calculations";
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

/** Tipo de la entrada de un dia del ciclo de un patron de turno. */
export type ShiftPatternDayValues = z.input<typeof patternScheduleSchema>;

/** Tipo de la entrada del formulario de asignacion de turno. */
export type ShiftAssignmentFormValues = z.input<typeof shiftAssignmentFormSchema>;

/* -------------------------------------------------------------------------- */
/* Reglas que dependen del contexto (spec 036 T8)                             */
/* -------------------------------------------------------------------------- */

/**
 * Contexto que la validacion del **patron de turno** necesita del exterior.
 *
 * Hay reglas que un schema estatico no puede expresar porque dependen de
 * datos que solo conoce la aplicacion: la unicidad del nombre (hay que
 * compararlo con los patrones ya guardados) y el maximo legal de horas (viene
 * de la configuracion global).
 *
 * La solucion no es dejar esas reglas fuera del formulario: es **inyectar el
 * contexto en el schema**, de modo que la regla vive en la capa de validacion
 * y el error sale como el resto (campo + mensaje + a11y).
 */
export interface ShiftPatternValidationContext {
  /** Patrones ya guardados (el nombre debe ser unico). */
  readonly existingPatterns: readonly { readonly id?: string; readonly name: string }[];
  /** Id del patron que se esta editando (su propio nombre no es duplicado). */
  readonly editingPatternId?: string;
  /** Maximo legal de horas semanales (configuracion global). */
  readonly maxWeeklyHours: number;
}

/**
 * Schema del patron de turno **con las reglas que dependen del contexto**.
 *
 * Es el schema de la T5 mas las reglas que el backend no puede impose:
 *
 * - el nombre no puede repetir el de otro patron;
 * - las horas del patron no pueden superar el maximo legal configurado;
 * - cada dia del ciclo necesita hora de inicio y de fin si no es dia libre;
 * - la colacion, si esta marcada, necesita minutos validos y no puede
 *   exceder la duracion del turno.
 *
 * **Hallazgo de la migracion (spec 036 T8):** el codigo anterior comprobaba
 * `netHours < 0` para rechazar un turno cuya hora de fin fuese anterior a la
 * de inicio, pero `calculateHoursBetween` **nunca devuelve un valor
 * negativo** (trunca a 0 y suma un dia al final, para admitir turnos que
 * cruzan la medianoche). La regla era **codigo muerto**: un turno de 17:00 a
 * 09:00 es valido por diseno. La migracion **preserva ese comportamiento**
 * (no inventa una rechazo nuevo); el turno de 00:00 a 00:00 sigue siendo
 * aceptable, como lo era antes.
 *
 * Los errores de un dia concreto se reportan en su ruta
 * (`dailySchedules[2].startTime`), de modo que la pantalla puede señalar el
 * dia exacto (spec 036 AC3).
 */
export const buildShiftPatternSchema = (context: ShiftPatternValidationContext) =>
  shiftPatternFormSchema.superRefine((values, ctx) => {
    const trimmedName = values.name.trim().toLowerCase();
    const isDuplicate = context.existingPatterns.some(
      (pattern) =>
        pattern.id !== context.editingPatternId &&
        pattern.name.trim().toLowerCase() === trimmedName,
    );

    if (isDuplicate) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.duplicateName(values.name.trim()),
        path: ["name"],
      });
    }

    if (values.maxHoursPattern > context.maxWeeklyHours) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.maxWeeklyHoursExceeded(
          values.maxHoursPattern,
          context.maxWeeklyHours,
        ),
        path: ["maxHoursPattern"],
      });
    }

    values.dailySchedules.forEach((day, index) => {
      const dayNumber = index + 1;

      if (!day.isOffDay && (!day.startTime || !day.endTime)) {
        ctx.addIssue({
          code: "custom",
          message: ERROR_MESSAGES.shiftDayRule(
            dayNumber,
            "la hora de inicio y la de fin son requeridas si el día no es libre.",
          ),
          path: ["dailySchedules", index, "startTime"],
        });
        return;
      }

      if (day.isOffDay) return;

      if (day.hasColacion && (day.colacionMinutes ?? 0) <= 0) {
        ctx.addIssue({
          code: "custom",
          message: ERROR_MESSAGES.shiftDayRule(
            dayNumber,
            "los minutos de colación deben ser mayores a 0.",
          ),
          path: ["dailySchedules", index, "colacionMinutes"],
        });
      }

      if (!day.startTime || !day.endTime) return;

      if (day.hasColacion) {
        const grossDuration = calculateHoursBetween(day.startTime, day.endTime, 0);
        if ((day.colacionMinutes ?? 0) / 60 > grossDuration) {
          ctx.addIssue({
            code: "custom",
            message: ERROR_MESSAGES.shiftDayRule(
              dayNumber,
              "los minutos de colación no pueden exceder la duración total del turno.",
            ),
            path: ["dailySchedules", index, "colacionMinutes"],
          });
        }
      }
    });
  });

/**
 * Contexto que la validacion de la **asignacion de turno** necesita.
 */
export interface ShiftAssignmentValidationContext {
  /** Patrones disponibles (para saber si el elegido es mensual). */
  readonly patterns: readonly { readonly id?: string; readonly cycleLengthDays: number }[];
  /** Fecha limite de antiguedad (`YYYY-MM-DD`). */
  readonly oldestAllowedStartDate: string;
}

/** Largos de ciclo que son "patrones mensuales" (28-31 dias). */
const MONTHLY_CYCLE_LENGTHS = [28, 29, 30, 31];

/**
 * Schema de la asignacion de turno **con las reglas que dependen del
 * contexto**.
 *
 * - la fecha de termino no puede ser anterior a la de inicio;
 * - no se pueden crear asignaciones con mas de 7 dias de antiguedad;
 * - los patrones mensuales (28-31 dias) exigen empezar el dia 1 y tener fecha
 *   de termino.
 *
 * El **conflicto de solapamiento** no es una regla de validacion: abre un
 * modal que pregunta como resolverlo, asi que lo decide el hook (spec 036
 * T8).
 */
export const buildShiftAssignmentSchema = (context: ShiftAssignmentValidationContext) =>
  shiftAssignmentFormSchema.superRefine((values, ctx) => {
    if (values.endDate && values.startDate > values.endDate) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.invalidDateRange(),
        path: ["endDate"],
      });
    }

    if (values.startDate < context.oldestAllowedStartDate) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.tooOldRecord(),
        path: ["startDate"],
      });
    }

    const selectedPattern = context.patterns.find(
      (pattern) => pattern.id === values.shiftPatternId,
    );
    if (!selectedPattern || !MONTHLY_CYCLE_LENGTHS.includes(selectedPattern.cycleLengthDays)) {
      return;
    }

    if (!values.startDate.endsWith("-01")) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.monthlyPatternStartDate(),
        path: ["startDate"],
      });
    }

    if (!values.endDate) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.monthlyPatternEndDate(),
        path: ["endDate"],
      });
    }
  });
