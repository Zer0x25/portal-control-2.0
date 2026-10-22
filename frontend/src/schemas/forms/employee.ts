import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import { isValidChileanRut } from "../../utils/validation";
import {
  EMPLOYEE_STATUSES,
  optionalBusinessDate,
  optionalEmailField,
  optionalNullableText,
  optionalText,
  requiredText,
  requiredTextMin,
} from "./common";

/**
 * Spec 036 T5 (AC2): alta y edicion de empleado (`EmployeeForm.tsx`).
 *
 * Contrato: `Employee` (`backend/src/models/schemas/employee.schemas.ts`).
 *
 * **Divergencia deliberada (regla exclusiva del cliente)**: el backend solo
 * exige `rut` con 8 caracteres (`min(8)`); el frontend valida ademas el
 * **digito verificador** del RUT. No es una desviacion del contrato: es una
 * regla que el backend no implementa y que el formulario aplica antes de
 * enviar. El fixture dorado `cases/employee.cases.json` la fija.
 */
export const employeeFormSchema = z.object({
  rut: requiredTextMin("El RUT", 8).refine(isValidChileanRut, ERROR_MESSAGES.invalidRut()),
  name: requiredTextMin("El nombre", 2),
  position: optionalText(),
  department: optionalText(),
  email: optionalEmailField(),
  phone: optionalText(),
  emergencyContact: optionalText(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  contractType: optionalText(),
  shiftPatternId: optionalText(),
  hireDate: optionalBusinessDate(),
  terminationDate: optionalNullableText(),
  address: optionalText(),
  commune: optionalText(),
  region: optionalText(),
  birthDate: optionalBusinessDate(),
  gender: optionalText(),
  bankName: optionalText(),
  accountType: optionalText(),
  accountNumber: optionalText(),
  pin: z
    .string()
    .trim()
    .regex(/^\d{4}$/, ERROR_MESSAGES.invalidPin())
    .nullable()
    .optional(),
  createUserAccount: z.boolean().optional(),
});

/** Tipo de la entrada del formulario de empleado. */
export type EmployeeFormValues = z.input<typeof employeeFormSchema>;

/** Tipo de la salida del formulario de empleado (payload ya normalizado). */
export type EmployeeFormPayload = z.output<typeof employeeFormSchema>;

/* -------------------------------------------------------------------------- */
/* El formulario de alta/edicion (spec 036 T9)                                 */
/* -------------------------------------------------------------------------- */

/**
 * Campos que el **formulario** escribe y el contrato `Employee` no declara.
 *
 * `area` y `workdayType` los escribe la pantalla de personal desde siempre,
 * pero el backend solo declara `department` (`backend/src/models/schemas/
 * employee.schemas.ts`): el backend **descarta** ambos campos al validar el
 * `POST /api/employees`. Es una divergencia **preexistente** (no la introduce
 * esta migracion) y se declara en el mapa de contratos (`localFields` +
 * `divergences`) en lugar de esconderse: el payload sigue siendo
 * **identico** al de antes (spec 036 T13).
 */
export const employeeFormFieldsSchema = employeeFormSchema.extend({
  /** El cargo es obligatorio en la pantalla (el backend lo admite opcional). */
  position: requiredText("El cargo"),
  /** Area o departamento (la pantalla lo escribe; el backend no lo declara). */
  area: requiredText("El área"),
  /** Tipo de jornada (la pantalla lo escribe; el backend no lo declara). */
  workdayType: requiredText("El tipo de jornada"),
});

/** Tipo de la entrada del formulario de alta/edicion de empleado. */
export type EmployeeFormFieldsValues = z.input<typeof employeeFormFieldsSchema>;

/**
 * Contexto que la validacion del **empleado** necesita del exterior.
 *
 * El RUT es unico en el padron: compararlo con los empleados ya cargados
 * exige conocerlos, y eso solo lo sabe la aplicacion.
 */
export interface EmployeeFormValidationContext {
  /** Empleados ya registrados (el RUT no puede repetirse). */
  readonly existingEmployees: readonly { readonly id?: string; readonly rut: string }[];
  /** Id del empleado que se esta editando (su propio RUT no es duplicado). */
  readonly employeeIdToEdit?: string;
}

/**
 * Schema del empleado **con las reglas que dependen del contexto**: el RUT no
 * puede ser el de otro empleado.
 *
 * El resto de las reglas (el digito verificador, el formato del email, los
 * campos obligatorios) viven en el schema: son reglas de contrato y salen
 * como error de campo (spec 036 AC2, AC3).
 */
export const buildEmployeeFormSchema = (context: EmployeeFormValidationContext) =>
  employeeFormFieldsSchema.superRefine((values, ctx) => {
    const rut = values.rut.trim();
    if (!rut) return;

    const isDuplicate = context.existingEmployees.some(
      (employee) => employee.rut === rut && employee.id !== context.employeeIdToEdit,
    );

    if (isDuplicate) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.duplicateRut(),
        path: ["rut"],
      });
    }
  });
