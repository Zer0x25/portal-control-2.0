import { z } from "./common";
import { MultiSmtpConfigSchema, SmtpVerifySchema } from "./smtpProfile.schemas";

export const EmailVerifySchema = SmtpVerifySchema.openapi("EmailVerify");
export const EmailOperationResultSchema = z
  .object({ success: z.boolean(), message: z.string() })
  .openapi("EmailOperationResult");

export const EmailConfigSchema = MultiSmtpConfigSchema.openapi("EmailConfig");

const EmailRuleSchema = z
  .object({
    enabled: z.boolean(),
    recipient: z
      .string()
      .trim()
      .refine((value) => value === "" || z.email().safeParse(value).success, "Correo inválido"),
  })
  .strict()
  .refine((value) => !value.enabled || !!value.recipient, {
    message: "Una regla activa requiere destinatario",
    path: ["recipient"],
  });
export const EmailRulesSchema = z
  .object({
    autoCloseShift: EmailRuleSchema,
    latenessOver15: EmailRuleSchema,
    latenessOver60: EmailRuleSchema,
  })
  .strict()
  .openapi("EmailRules");

export const SendTestEmailSchema = z
  .object({
    to: z.string().trim().email(),
    subject: z.string().optional().default(""),
    message: z.string().optional().default(""),
  })
  .strict()
  .openapi("SendTestEmail");
