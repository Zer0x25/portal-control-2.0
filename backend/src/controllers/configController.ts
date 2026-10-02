import { Request, Response } from "express";
import { ConfigService } from "../services/ConfigService";
import { AuthRequest } from "../middleware/authMiddleware";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError, ForbiddenError, ValidationError } from "../utils/AppError";
import { closureValidationService } from "../services/closureValidationService";
import fs from "fs/promises";
import path from "path";
import { toCaughtError } from "../utils/caughtError";

const COMPANY_POLICY_CONFIG_KEY = "company_policy_meta";
const COMPANY_POLICY_DIR = path.resolve(process.cwd(), "uploads", "company-policy");

type CompanyPolicyMeta = {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
};

export const getServerTime = asyncHandler(async (req: Request, res: Response) => {
  const time = ConfigService.getServerTime();
  res.json(time);
});

export const getConfig = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  if (!key || typeof key !== "string") {
    throw new ValidationError("Falta la clave de configuración o es inválida");
  }

  const role = (req as AuthRequest).user?.role;
  try {
    const value = await ConfigService.get(key, role);
    res.json(value);
  } catch (e: unknown) {
    const caught = toCaughtError(e);
    if (caught.message === "FORBIDDEN") {
      throw new ForbiddenError("Acceso denegado");
    }
    throw e;
  }
});

export const listConfigs = asyncHandler(async (req: Request, res: Response) => {
  const role = (req as AuthRequest).user?.role;
  const configs = await ConfigService.list(role);
  res.json(configs);
});

export const setConfig = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  if (!key || typeof key !== "string") {
    throw new ValidationError("Falta la clave de configuración o es inválida");
  }

  const actorUsername = (req as AuthRequest).user?.username || "SYSTEM";

  try {
    const updatedValue = await ConfigService.set(key, value, actorUsername);
    res.json(updatedValue);
  } catch (e: unknown) {
    const caught = toCaughtError(e);
    if (caught.message === "LOCK_DATE_BLOCKED") {
      throw new AppError(
        caught.message_display ||
          `No se puede cerrar el periodo hasta el ${value}. Existen ítems pendientes que requieren atención.`,
        400,
        "LOCK_DATE_BLOCKED",
      );
    }
    throw e;
  }
});

export const validateClosure = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;

  if (!date || typeof date !== "string") {
    throw new ValidationError("Falta la fecha de cierre o es inválida");
  }

  const result = await closureValidationService.validateManualClosure(date);
  res.json(result);
});

export const getPublicCompanyPolicy = asyncHandler(async (_req: Request, res: Response) => {
  const value = await ConfigService.get(COMPANY_POLICY_CONFIG_KEY);
  if (!value || typeof value !== "object") {
    return res.status(404).json({ message: "No hay reglamento cargado" });
  }

  const meta = value as CompanyPolicyMeta;
  return res.json({
    ...meta,
    url: "/api/configs/public/company-policy/file",
  });
});

export const downloadPublicCompanyPolicy = asyncHandler(async (_req: Request, res: Response) => {
  const value = await ConfigService.get(COMPANY_POLICY_CONFIG_KEY);
  if (!value || typeof value !== "object") {
    return res.status(404).json({ message: "No hay reglamento cargado" });
  }

  const meta = value as CompanyPolicyMeta;
  const filePath = path.join(COMPANY_POLICY_DIR, path.basename(meta.filename));

  try {
    await fs.access(filePath);
  } catch {
    return res.status(404).json({ message: "No hay reglamento cargado" });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(meta.originalName)}"`,
  );
  res.sendFile(filePath);
});

export const uploadCompanyPolicy = asyncHandler(async (req: Request, res: Response) => {
  const actorUsername = (req as AuthRequest).user?.username || "SYSTEM";
  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (!file) {
    throw new ValidationError("Debes adjuntar un archivo PDF.");
  }

  const previousMeta = await ConfigService.get(COMPANY_POLICY_CONFIG_KEY);
  const nextMeta: CompanyPolicyMeta = {
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
    uploadedAt: new Date().toISOString(),
    uploadedBy: actorUsername,
  };

  await ConfigService.set(COMPANY_POLICY_CONFIG_KEY, nextMeta, actorUsername);

  if (previousMeta && typeof previousMeta === "object" && "filename" in previousMeta) {
    const oldFileName = String((previousMeta as { filename: unknown }).filename);
    if (oldFileName && oldFileName !== file.filename) {
      const oldPath = path.join(COMPANY_POLICY_DIR, path.basename(oldFileName));
      await fs.unlink(oldPath).catch(() => undefined);
    }
  }

  return res.status(201).json({
    message: "Reglamento actualizado correctamente.",
    ...nextMeta,
    url: "/api/configs/public/company-policy/file",
  });
});
