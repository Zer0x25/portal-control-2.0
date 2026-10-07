import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { asyncHandler } from "../middleware/errorHandler";
import { auditFlows } from "../services/auditFlows";
import type { AuditQuery } from "../modules/audit";
export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  res.json(await auditFlows.list(req.query as AuditQuery));
});
export const cleanupAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  res.json(await auditFlows.cleanup(req.body));
});
export const createAuditLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  res
    .status(201)
    .json(await auditFlows.create(req.body, { username: req.user?.username, ip: req.ip }));
});
export const exportAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as AuditQuery;
  if (query.format === "csv" || query.format === "xml") {
    await auditFlows.exportStream(res, query);
  } else res.json(await auditFlows.exportJson(query));
});
export const verifyIntegrity = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await auditFlows.verify());
});
export const getIntegrityStatus = asyncHandler(async (_req: Request, res: Response) => {
  res.json(auditFlows.status());
});
