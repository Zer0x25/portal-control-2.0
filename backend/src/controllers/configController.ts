import type { Response } from "express";
import path from "node:path";
import type { AuthRequest } from "../middleware/authMiddleware";
import { asyncHandler } from "../middleware/errorHandler";
import { configFlows as flows } from "../services/configFlows";
export const getServerTime = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json(flows.time());
});
export const getConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await flows.get(req.params.key, req.user?.role));
});
export const listConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await flows.list(req.user?.role));
});
export const setConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await flows.set(req.params.key, req.body.value, req.user?.username));
});
export const validateClosure = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await flows.closure(req.query.date));
});
export const getPublicCompanyPolicy = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const value = await flows.policy();
  return value ? res.json(value) : res.status(404).json({ message: "No hay reglamento cargado" });
});
export const downloadPublicCompanyPolicy = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const file = await flows.download();
    if (!file) return res.status(404).json({ message: "No hay reglamento cargado" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.originalName)}"`,
    );
    res.sendFile(path.basename(file.path), { root: path.dirname(file.path) });
  },
);
export const uploadCompanyPolicy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const file = req.file;
  res.status(201).json(
    await flows.upload(
      file
        ? {
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
          }
        : undefined,
      req.user?.username,
    ),
  );
});
