import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { asyncHandler } from "../middleware/errorHandler";
import { adminFlows } from "../services/adminFlows";
export const diagnoseAutoClose = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await adminFlows.diagnosis());
});
export const triggerAutoClose = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await adminFlows.autoClose(req.user || {}));
});
export const triggerAccountingAutoClosure = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    res.json(await adminFlows.accountingClose(req.user || {}));
  },
);
export const resetUserPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await adminFlows.resetPassword(req.body, req.user || {}));
});
export const getSystemStats = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await adminFlows.stats());
});
export const getSecurityInsights = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await adminFlows.insights());
});
export const triggerBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  await adminFlows.backup(req.user || {}, (body) => {
    res.json(body);
  });
});
export const getBackups = asyncHandler(async (_req: Request, res: Response) => {
  res.json(adminFlows.backups());
});
export const restoreBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  await adminFlows.restore(req.body, req.user || {}, (body) => {
    res.json(body);
  });
});
export const restartBackend = asyncHandler(async (req: AuthRequest, res: Response) => {
  await adminFlows.restart(req.user || {}, (body) => {
    res.json(body);
  });
});
export const purgeSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await adminFlows.purge(req.body, req.user || {}));
});
export const getIntegrityStatus = asyncHandler(async (_req: Request, res: Response) => {
  res.json(adminFlows.status());
});
