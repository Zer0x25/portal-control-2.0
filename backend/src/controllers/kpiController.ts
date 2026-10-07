import { Request, Response } from "express";
import { kpiFlows } from "../services/kpiFlows";
import { asyncHandler } from "../middleware/errorHandler";
export const getKpiSummary = asyncHandler(async (req: Request, res: Response) => {
  res.json(await kpiFlows.summary(req.body));
});
export const getDetailedReport = asyncHandler(async (req: Request, res: Response) => {
  res.json(await kpiFlows.detailed(req.body));
});
export const getDashboardOverview = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await kpiFlows.overview());
});
export const getDailyPlanningSummary = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await kpiFlows.daily());
});
