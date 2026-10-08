import { z } from "./common";

export const SmtpProfileSchema = z
  .object({
    host: z.string().trim(),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
    user: z.string().trim(),
    pass: z.string(),
    fromEmail: z
      .string()
      .trim()
      .refine((value) => value === "" || z.email().safeParse(value).success, "Correo inválido"),
    fromName: z.string(),
  })
  .strict();

export const SmtpVerifySchema = SmtpProfileSchema.extend({
  host: z.string().trim().min(1),
  fromEmail: z.string().trim().email(),
});

export const MultiSmtpConfigSchema = z
  .object({
    profiles: z.array(SmtpProfileSchema).length(3),
    activeProfileIndex: z.number().int().min(0).max(2),
  })
  .strict()
  .refine(
    (value) =>
      !value.profiles[value.activeProfileIndex].host ||
      !!value.profiles[value.activeProfileIndex].fromEmail,
    { message: "El perfil activo requiere un remitente válido", path: ["profiles"] },
  );
