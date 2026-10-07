import { z } from "zod";
export const SmtpProfileSchema = z.object({
  host: z.string(),
  port: z.number(),
  secure: z.boolean(),
  user: z.string(),
  pass: z.string(),
  fromEmail: z.string().email(),
  fromName: z.string(),
});

export const MultiSmtpConfigSchema = z.object({
  profiles: z.array(SmtpProfileSchema).length(3),
  activeProfileIndex: z.number().min(0).max(2),
});
