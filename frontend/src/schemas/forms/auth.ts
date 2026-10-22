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
 *
 * **Regla estricta del cliente**: el formulario **no normaliza** (la
 * credencial viaja tal cual la escribe el usuario, spec 036 T13), asi que sin
 * esto un campo vacio llegaria a la API. Antes lo bloqueaba el `required`
 * nativo del `<form>`; ahora el error sale junto al campo (spec 036 AC3). Un
 * `superRefine` no aparece en el JSON Schema que compara la paridad, asi que
 * el contrato `Login` no cambia.
 */
export const loginFormSchema = z
  .object({
    username: requiredText("El usuario"),
    password: requiredText("La contraseña"),
  })
  .superRefine((values, ctx) => {
    if (!values.username) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.required("El usuario"),
        path: ["username"],
      });
    }
    if (!values.password) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.required("La contraseña"),
        path: ["password"],
      });
    }
  });

/**
 * Copia del contrato `MFAValidate`
 * (`backend/src/models/schemas/auth-user.schemas.ts`).
 *
 * El backend exige el token MFA **y** el codigo. El modal de inicio de sesion
 * solo escribe el codigo: el token lo aporta la sesion, asi que el formulario
 * usa el subconjunto `mfaLoginFormSchema`.
 */
export const mfaValidateFormSchema = z.object({
  mfaToken: requiredTextMin("El token MFA", 1),
  code: requiredTextMin("El codigo", 6).max(6, ERROR_MESSAGES.maxLength("El codigo", 6)),
});

/**
 * Codigo MFA del formulario de inicio de sesion (`MFALoginModal.tsx`).
 *
 * Contrato: `MFAValidate` -> `code`.
 *
 * El modal solo escribe **este** campo. Las reglas de longitud son las del
 * backend (exactamente 6).
 */
export const mfaLoginFormSchema = z.object({
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
 * Codigo TOTP del alta de MFA (`MFASetupModal.tsx`).
 *
 * Contrato: `MFAVerify` -> `token`.
 *
 * El formulario exige **6 digitos numericos**: es una regla del cliente (el
 * backend solo pide 1+ caracteres, porque el TOTP real lo valida la libreria
 * TOTP del servidor). Como un `pattern` no lo puede expresar el OpenAPI sin
 * desincronizar la paridad, se declara como `superRefine`, igual que el resto
 * de reglas exclusivas del frontend.
 */
export const buildMfaSetupFormSchema = () =>
  mfaSetupFormSchema.superRefine((values, ctx) => {
    if (/^\d{6}$/.test(values.token)) return;
    ctx.addIssue({
      code: "custom",
      message: ERROR_MESSAGES.invalidSixDigitCode(),
      path: ["token"],
    });
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

/**
 * Purga de sesiones activas (`SystemMaintenance`).
 *
 * Contrato: `PurgeSessions` (`username` opcional de 1+ caracteres).
 *
 * El campo es **opcional a proposito**: vacio significa "purgar todas las
 * sesiones", que es exactamente lo que la pantalla interpreta (la normalizacion
 * de la capa convierte `""` en `undefined` y el backend recibe el objeto sin
 * `username`).
 */
export const purgeSessionsFormSchema = z.object({
  username: z.string().trim().min(1, ERROR_MESSAGES.minLength("El usuario", 1)).optional(),
});

/** Tipo de la entrada del formulario de inicio de sesion. */
export type LoginFormValues = z.input<typeof loginFormSchema>;

/** Tipo de la entrada del formulario de codigo MFA. */
export type MfaLoginFormValues = z.input<typeof mfaLoginFormSchema>;

/** Tipo de la entrada del formulario de alta de MFA. */
export type MfaSetupFormValues = z.input<typeof mfaSetupFormSchema>;

/** Tipo de la entrada del formulario de cambio de contraseña. */
export type ChangePasswordFormValues = z.input<typeof changePasswordFormSchema>;

/** Tipo de la entrada del formulario de reseteo de contraseña. */
export type AdminResetPasswordFormValues = z.input<typeof adminResetPasswordFormSchema>;

/** Tipo de la entrada del formulario de purga de sesiones. */
export type PurgeSessionsFormValues = z.input<typeof purgeSessionsFormSchema>;
