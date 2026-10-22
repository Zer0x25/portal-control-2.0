import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import { isValidChileanRut } from "../../utils/validation";
import {
  EMPLOYEE_STATUSES,
  emailField,
  optionalBusinessDate,
  optionalNullableText,
  optionalText,
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
  email: emailField("El email", true),
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
