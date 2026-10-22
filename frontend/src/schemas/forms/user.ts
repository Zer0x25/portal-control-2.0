import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import type { UserRole } from "../../types/index";
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

/* -------------------------------------------------------------------------- */
/* El formulario de usuario (spec 036 T9)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Estado del formulario de usuario (alta y edicion).
 *
 * `password` es `undefined` en la edicion: el campo no se muestra y su valor
 * no viaja al backend (la edicion solo actualiza el rol y el empleado).
 */
export interface UserFormValues {
  /** Nombre de usuario (sin tildes: lo normaliza la pantalla). */
  username: string;
  /** Contraseña (solo en el alta). */
  password?: string;
  /** Nivel de autorizacion. */
  role: UserRole;
  /** Empleado vinculado (opcional). */
  employeeId?: string;
}

/**
 * Contexto que la validacion del **usuario** necesita del exterior.
 */
export interface UserFormValidationContext {
  /** Se esta editando un usuario (la contraseña no se toca). */
  readonly isEditing: boolean;
}

/**
 * Schema del formulario de usuario (alta y edicion).
 *
 * Las reglas son las del backend (`CreateUser`/`UpdateUser`):
 *
 * - `username`: 3 caracteres minimos;
 * - `password`: 6 caracteres minimos **en el alta** (en la edicion el campo
 *   no se muestra: el backend solo actualiza el rol y el empleado vinculado);
 * - `role`: el enum de roles del backend;
 * - `employeeId`: opcional.
 *
 * La regla del alta (la contraseña es obligatoria) depende del contexto, asi
 * que vive en el `superRefine` del constructor y no en el schema base.
 */
export const buildUserFormSchema = (context: UserFormValidationContext) =>
  z
    .object({
      username: requiredTextMin("El usuario", 3),
      password: requiredTextMin("La contraseña", 6).optional(),
      role: z.enum(USER_ROLES),
      employeeId: optionalText(),
    })
    .superRefine((values, ctx) => {
      if (context.isEditing) return;
      if (values.password === undefined || values.password.length < 6) {
        // El formulario **no muestra** un campo de contraseña (muestra la
        // temporal que el backend asigna), asi que el error es de formulario y
        // no de campo: se muestra arriba, no junto a un input inexistente.
        ctx.addIssue({
          code: "custom",
          message: ERROR_MESSAGES.required("La contraseña"),
        });
      }
    });
