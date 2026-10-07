import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { emailReportFlows as flows } from "../services/emailReportFlows";
export const verifyConfig = asyncHandler(async (req: Request, res: Response) => {
  res.json(await flows.verify(req.body));
});
export const saveConfig = asyncHandler(async (req: Request, res: Response) => {
  res.json(await flows.saveConfig(req.body));
});
export const getConfig = asyncHandler(async (req: Request, res: Response) => {
  res.json(await flows.config());
});
export const getRules = asyncHandler(async (req: Request, res: Response) => {
  res.json(await flows.rules());
});
export const saveRules = asyncHandler(async (req: Request, res: Response) => {
  res.json(await flows.saveRules(req.body));
});
export const sendTestEmail = asyncHandler(async (req: Request, res: Response) => {
  res.json(await flows.send(req.body));
});
