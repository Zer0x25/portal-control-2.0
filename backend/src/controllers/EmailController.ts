import { Request, Response } from "express";
import { EmailService, SmtpConfig, MultiSmtpConfig } from "../services/EmailService";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import { ValidationError } from "../utils/AppError";

const emailService = new EmailService();

const SmtpProfileSchema = z.object({
  host: z.string(),
  port: z.number(),
  secure: z.boolean(),
  user: z.string(),
  pass: z.string(),
  fromEmail: z.string().email(),
  fromName: z.string(),
});

const MultiSmtpConfigSchema = z.object({
  profiles: z.array(SmtpProfileSchema).length(3),
  activeProfileIndex: z.number().min(0).max(2),
});

export const verifyConfig = asyncHandler(async (req: Request, res: Response) => {
  try {
    const validated = SmtpProfileSchema.parse(req.body) as SmtpConfig;
    const result = await emailService.verifyConnection(validated);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Datos de configuración inválidos", error.errors);
    }
    throw error;
  }
});

export const saveConfig = asyncHandler(async (req: Request, res: Response) => {
  try {
    const validated = MultiSmtpConfigSchema.parse(req.body) as MultiSmtpConfig;
    await emailService.saveMultiSmtpConfig(validated);
    res.json({
      success: true,
      message: "Configuración guardada correctamente.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Datos de configuración inválidos", error.errors);
    }
    throw error;
  }
});

export const getConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await emailService.getMultiSmtpConfig(true); // Masked
  res.json(config);
});

export const getRules = asyncHandler(async (req: Request, res: Response) => {
  const rules = await emailService.getNotificationRules();
  res.json(rules);
});

export const saveRules = asyncHandler(async (req: Request, res: Response) => {
  await emailService.saveNotificationRules(req.body);
  res.json({ success: true, message: "Reglas guardadas correctamente." });
});

export const sendTestEmail = asyncHandler(async (req: Request, res: Response) => {
  const { to, subject, message } = req.body;
  const result = await emailService.sendEmail(to, subject, message);
  res.json(result);
});
