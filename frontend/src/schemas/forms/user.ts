import { z } from "zod";

import { USER_ROLES, optionalText, requiredTextMin } from "./common";

/**
 * Spec 036 T5 (AC2): alta de usuario (`UserForm.tsx`).
 *
 * Contrato: `CreateUser` (`backend/src/models/schemas/auth-user.schemas.ts`).
 */
export const userCreateFormSchema = z.object({
  username: requiredTextMin("El usuario", 3),
  password: requiredTextMin("La contraseña", 6),
  role: z.enum(USER_ROLES),
  employeeId: optionalText(),
});

/**
 * Spec 036 T5 (AC2): edicion de usuario (`UserForm.tsx`).
 *
 * Contrato: `UpdateUser` (`backend/src/models/schemas/auth-user.schemas.ts`).
 * Todos los campos son opcionales: el backend solo actualiza lo que llega.
 */
export const userUpdateFormSchema = z.object({
  username: requiredTextMin("El usuario", 3).optional(),
  password: requiredTextMin("La contraseña", 6).optional(),
  role: z.enum(USER_ROLES).optional(),
  employeeId: optionalText(),
});

/** Tipo de la entrada del formulario de alta de usuario. */
export type UserCreateFormValues = z.input<typeof userCreateFormSchema>;

/** Tipo de la entrada del formulario de edicion de usuario. */
export type UserUpdateFormValues = z.input<typeof userUpdateFormSchema>;
