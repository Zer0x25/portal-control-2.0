import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import { requiredText, requiredTextMin } from "./common";

/**
 * Spec 036 T5 (AC2): formularios de autenticacion.
 *
 * Contratos: `Login`, `MFALogin`, `MFAValidate`, `MFAVerify` y `ResetPassword`
 * (`backend/src/models/schemas/auth-user.schemas.ts` y `core.schemas.ts`).
 */

/**
 * Inicio de sesion (`LoginPage.tsx`).
 *
 * Contrato: `Login` (el backend exige `username` y `password`, sin reglas de
 * formato: el mensaje de credenciales invalidas lo da la API).
 */
export const loginFormSchema = z.object({
  username: requiredText("El usuario"),
  password: requiredText("La contraseña"),
});

/**
 * Validacion del codigo MFA durante el inicio de sesion (`MFALoginModal.tsx`).
 *
 * Contrato: `MFAValidate` (`mfaToken` de 1+ caracteres y `code` de 6).
 */
export const mfaCodeFormSchema = z.object({
  mfaToken: requiredTextMin("El token MFA", 1),
  code: requiredTextMin("El codigo", 6).max(6, ERROR_MESSAGES.maxLength("El codigo", 6)),
});

/**
 * Verificacion del alta de MFA (`MFASetupModal.tsx`).
 *
 * Contrato: `MFAVerify` (`token` de 1+ caracteres).
 */
export const mfaSetupFormSchema = z.object({
  token: requiredTextMin("El token", 1),
});

/**
 * Cambio de contraseña del propio usuario (`ChangePasswordModal.tsx`).
 *
 * Contrato: `UpdateUser` (el backend solo exige `password` con 6+ caracteres).
 *
 * `passwordConfirm` es un campo **solo de cliente**: no viaja al backend, es
 * la confirmacion de que las dos contraseñas coinciden.
 */
export const changePasswordFormSchema = z
  .object({
    password: requiredTextMin("La contraseña", 6),
    passwordConfirm: requiredTextMin("La confirmación", 6),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    message: ERROR_MESSAGES.passwordMismatch(),
    path: ["passwordConfirm"],
  });

/**
 * Cambio de contraseña forzado por el administrador (`ForceChangePasswordModal.tsx`).
 *
 * Contrato: `UpdateUser` (mismas reglas que el cambio de contraseña propio).
 */
export const forceChangePasswordFormSchema = changePasswordFormSchema;

/**
 * Reseteo de contraseña de un usuario (`SystemMaintenance`).
 *
 * Contrato: `ResetPassword` (`username` de 1+ y `newPassword` de 6+).
 */
export const adminResetPasswordFormSchema = z.object({
  username: requiredTextMin("El usuario", 1),
  newPassword: requiredTextMin("La nueva contraseña", 6),
});

/** Tipo de la entrada del formulario de inicio de sesion. */
export type LoginFormValues = z.input<typeof loginFormSchema>;

/** Tipo de la entrada del formulario de cambio de contraseña. */
export type ChangePasswordFormValues = z.input<typeof changePasswordFormSchema>;
