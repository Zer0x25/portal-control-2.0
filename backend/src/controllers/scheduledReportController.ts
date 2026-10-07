import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { asyncHandler } from "../middleware/errorHandler";
import { emailReportFlows as flows } from "../services/emailReportFlows";
export const getScheduledReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await flows.list());
});
export const getScheduledReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await flows.get(req.params.id as string));
});
export const createScheduledReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(201).json(await flows.create(req.body, req.user?.username));
});
export const updateScheduledReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await flows.update(req.params.id as string, req.body));
});
export const deleteScheduledReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  await flows.remove(req.params.id as string);
  res.status(204).send();
});
export const toggleReportStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await flows.toggle(req.params.id as string));
});
