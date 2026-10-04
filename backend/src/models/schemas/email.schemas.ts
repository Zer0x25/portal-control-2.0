import { z } from "./common";

export const EmailConfigSchema = z
  .object({
    host: z.string().min(1),
    port: z.number().int(),
    secure: z.boolean(),
    auth: z.object({
      user: z.string().min(1),
      pass: z.string().min(1),
    }),
    from: z.string().email(),
  })
  .openapi("EmailConfig");

export const EmailRulesSchema = z
  .object({
    notifyOnAbsence: z.boolean(),
    notifyOnLate: z.boolean(),
    notifyOnLeaveRequest: z.boolean(),
    digestFrequency: z.enum(["daily", "weekly", "none"]),
    recipients: z.array(z.string().email()),
  })
  .openapi("EmailRules");

export const SendTestEmailSchema = z
  .object({
    // Contrato real con el frontend (emailService.sendTestEmail manda
    // { to, subject, message }). `recipient` nunca existió en el caller y
    // el endpoint devolvía 400 siempre (caza-bugs 2026-10-04).
    to: z.string().email(),
    subject: z.string().optional().default(""),
    message: z.string().optional().default(""),
  })
  .openapi("SendTestEmail");
