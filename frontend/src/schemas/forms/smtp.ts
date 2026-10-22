import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import { requiredText, requiredTextMin } from "./common";

/**
 * Perfil SMTP (`SmtpConfigModal.tsx`).
 *
 * Contrato: `EmailConfig` -> `profiles[]` (`backend/src/models/schemas/smtpProfile.schemas.ts`).
 *
 * El backend exige `fromEmail` **o vacio** (`""` o correo valido): un perfil
 * sin remitente se permite mientras el perfil no sea el activo. Esa regla
 * condicional no la expresa el OpenAPI: vive en el fixture dorado
 * `cases/smtp.cases.json`.
 */
export const smtpProfileFormSchema = z.object({
  host: requiredText("El servidor"),
  port: z
    .number({ error: ERROR_MESSAGES.required("El puerto") })
    .int(ERROR_MESSAGES.invalidNumber())
    .min(1, ERROR_MESSAGES.minValue("El puerto", 1))
    .max(65535, ERROR_MESSAGES.maxValue("El puerto", 65535)),
  secure: z.boolean(),
  user: requiredText("El usuario"),
  pass: requiredText("La contraseña"),
  fromEmail: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.email().safeParse(value).success,
      ERROR_MESSAGES.invalidEmail(),
    ),
  fromName: requiredText("El nombre del remitente"),
});

/**
 * Spec 036 T10c (AC2): perfil SMTP del **formulario** (`SmtpConfigModal.tsx`).
 *
 * Contrato: `EmailConfig` -> `profiles[]` (`backend/src/models/schemas/smtpProfile.schemas.ts`).
 *
 * El formulario es **mas estricto** que el backend en los campos que la
 * pantalla marca como obligatorios (el `required` del `<input>`): el host, el
 * usuario, la contraseña, el nombre del remitente y el propio remitente (que
 * ademas tiene que ser un correo valido). El backend admite la cadena vacia
 * en esos campos, asi que la regla se declara como divergencia en el mapa de
 * contratos y no se esconde en el schema.
 *
 * El JSON Schema no cambia (las reglas del cliente no son expresables en
 * OpenAPI), asi que la paridad con el backend se mantiene.
 */
export const buildSmtpProfileFormSchema = () =>
  smtpProfileFormSchema.superRefine((values, ctx) => {
    const required = (
      field: "host" | "user" | "pass" | "fromName" | "fromEmail",
      label: string,
    ) => {
      if (values[field].trim() !== "") return;
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.required(label),
        path: [field],
      });
    };

    required("host", "El servidor");
    required("user", "El usuario");
    required("pass", "La contraseña");
    required("fromName", "El nombre del remitente");
    required("fromEmail", "El remitente");
  });

/**
 * Configuracion multi-perfil SMTP (`SmtpConfigModal.tsx`).
 *
 * Contrato: `EmailConfig` (`backend/src/models/schemas/smtpProfile.schemas.ts`):
 * exactamente 3 perfiles y un indice activo entre 0 y 2.
 */
export const smtpConfigFormSchema = z.object({
  profiles: z.array(smtpProfileFormSchema).length(3),
  activeProfileIndex: z
    .number({ error: ERROR_MESSAGES.required("El perfil activo") })
    .int(ERROR_MESSAGES.invalidNumber())
    .min(0, ERROR_MESSAGES.minValue("El perfil activo", 0))
    .max(2, ERROR_MESSAGES.maxValue("El perfil activo", 2)),
});

/**
 * Verificacion de un perfil SMTP (`SmtpConfigModal.tsx`, boton "probar").
 *
 * Contrato: `EmailVerify` (`backend/src/models/schemas/smtpProfile.schemas.ts`):
 * a diferencia del perfil guardado, aqui el host y el remitente son
 * **obligatorios** y el remitente debe ser un correo valido.
 */
export const smtpVerifyFormSchema = z.object({
  host: requiredTextMin("El servidor", 1),
  port: z
    .number({ error: ERROR_MESSAGES.required("El puerto") })
    .int(ERROR_MESSAGES.invalidNumber())
    .min(1, ERROR_MESSAGES.minValue("El puerto", 1))
    .max(65535, ERROR_MESSAGES.maxValue("El puerto", 65535)),
  secure: z.boolean(),
  user: requiredText("El usuario"),
  pass: requiredText("La contraseña"),
  fromEmail: z
    .string({ error: ERROR_MESSAGES.required("El remitente") })
    .trim()
    .email(ERROR_MESSAGES.invalidEmail()),
  fromName: requiredText("El nombre del remitente"),
});

/**
 * Reglas de correo (`SystemMaintenance`).
 *
 * Contrato: `EmailRules` (`backend/src/models/schemas/email.schemas.ts`).
 * Una regla activa exige destinatario: el OpenAPI no expresa la condicion, la
 * implementa el backend con un `refine`.
 */
export const emailRuleFormSchema = z
  .object({
    enabled: z.boolean(),
    recipient: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || z.email().safeParse(value).success,
        ERROR_MESSAGES.invalidEmail(),
      ),
  })
  .refine((value) => !value.enabled || Boolean(value.recipient), {
    message: "Una regla activa requiere destinatario.",
    path: ["recipient"],
  });

/** Configuracion de las tres reglas de correo. */
export const emailRulesFormSchema = z.object({
  autoCloseShift: emailRuleFormSchema,
  latenessOver15: emailRuleFormSchema,
  latenessOver60: emailRuleFormSchema,
});

/**
 * Envio de un correo de prueba (`EmailCenter`).
 *
 * Contrato: `SendTestEmail` (`backend/src/models/schemas/email.schemas.ts`).
 *
 * El backend admite `subject` y `message` **vacios** (los pone por defecto);
 * el formulario del centro de correo los exige (divergencia declarada en el
 * mapa de contratos).
 */
export const sendTestEmailFormSchema = z.object({
  to: z
    .string({ error: ERROR_MESSAGES.required("El destinatario") })
    .trim()
    .email(ERROR_MESSAGES.invalidEmail()),
  subject: requiredText("El asunto"),
  message: requiredText("El mensaje"),
});

/** Tipo de la entrada del formulario de perfil SMTP. */
export type SmtpProfileFormValues = z.input<typeof smtpProfileFormSchema>;

/** Tipo de la entrada del formulario de correo de prueba. */
export type SendTestEmailFormValues = z.input<typeof sendTestEmailFormSchema>;

/** Tipo de la entrada del formulario de reglas de correo. */
export type EmailRulesFormValues = z.input<typeof emailRulesFormSchema>;
